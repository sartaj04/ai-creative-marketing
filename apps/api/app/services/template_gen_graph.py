"""LangGraph multi-agent pipeline: Upload image → Generate editable HTML/CSS template.

Agents:
  1. Vision Analyzer (Gemini)   — extracts layout spec from uploaded image
  2. Layout Generator (Claude)  — produces HTML/CSS with {{variable}} slots
  3. Image Source (Unsplash + Nano Banana) — fetches/generates placeholder images
  4. Review Agent (Gemini)      — validates output quality
"""
import asyncio
import base64
import io
import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, TypedDict

from google import genai
from google.genai import types
from google.oauth2 import service_account
from langgraph.graph import END, START, StateGraph

from app.core.config import settings

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="template-gen")

MAX_REGENERATIONS = 3

# SVG profile-pic placeholder (generic user silhouette)
PROFILE_PIC_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="#94A3B8"><circle cx="12" cy="8" r="4"/><path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6"/></svg>'''


# ============================================================================
# State
# ============================================================================

class TemplateGenState(TypedDict):
    """State passed between agents in the template generation pipeline."""
    upload_image_b64: str          # base64-encoded uploaded image
    upload_type: str               # "image" or "pdf"
    template_type: str             # "image" or "carousel"
    aspect_ratio: str              # "1:1", "16:9", "9:16"
    user_id: str

    # Vision output
    layout_spec: Optional[dict]    # layout analysis from Gemini
    image_queries: list[str]       # search queries for Unsplash photos
    bg_descriptions: list[str]     # descriptions for AI-generated backgrounds
    has_profile_pic: bool
    detected_slide_count: int

    # Layout output
    # Variable extraction output
    html_template: str             # HTML with {{variable}} injected
    variables_schema: dict
    default_values: dict
    slides: list[dict]             # [{html_structure, variable_schema, default_values}, ...]

    # Image source output
    placeholder_urls: dict         # {variable_name: url}

    # Review
    review_passed: bool
    review_feedback: str
    regeneration_count: int

    # Final
    template_name: str
    template_category: str
    errors: list[str]


# ============================================================================
# Template Generation Graph
# ============================================================================

class TemplateGenGraph:
    """Multi-agent pipeline for generating editable HTML/CSS templates from images."""

    def __init__(self):
        self._gemini_client = None
        self._claude_llm = None
        self._graph = self._build_graph()

    # ── Credentials ──────────────────────────────────────────────────

    def _ensure_gemini(self):
        if self._gemini_client is None:
            if settings.GCP_CLIENT_EMAIL and settings.GCP_PRIVATE_KEY:
                creds = service_account.Credentials.from_service_account_info(
                    {
                        "type": "service_account",
                        "project_id": settings.GCP_PROJECT_ID,
                        "private_key": (settings.GCP_PRIVATE_KEY or "").replace("\\n", "\n"),
                        "client_email": settings.GCP_CLIENT_EMAIL,
                        "token_uri": "https://oauth2.googleapis.com/token",
                    },
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )
                self._gemini_client = genai.Client(
                    vertexai=True,
                    project=settings.GCP_PROJECT_ID,
                    location=settings.GCP_LOCATION,
                    credentials=creds,
                )
            else:
                self._gemini_client = genai.Client(
                    vertexai=True,
                    project=settings.GCP_PROJECT_ID,
                    location=settings.GCP_LOCATION,
                )

    def _ensure_claude(self):
        if self._claude_llm is None:
            if not all([
                settings.AWS_BEDROCK_ACCESS_KEY_ID,
                settings.AWS_BEDROCK_SECRET_ACCESS_KEY,
                settings.AWS_BEDROCK_REGION,
            ]):
                logger.warning("AWS Bedrock not configured, Claude unavailable for layout gen")
                return
            import boto3
            from langchain_aws import ChatBedrockConverse
            session = boto3.Session(
                aws_access_key_id=settings.AWS_BEDROCK_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_BEDROCK_SECRET_ACCESS_KEY,
                region_name=settings.AWS_BEDROCK_REGION,
            )
            self._claude_llm = ChatBedrockConverse(
                model=settings.BEDROCK_MODEL_ID,
                region_name=settings.AWS_BEDROCK_REGION,
                credentials_profile_name=None,
                client=session.client("bedrock-runtime"),
                temperature=0.4,
                max_tokens=8190,  # Claude 3.5 Sonnet max output tokens
            )

    # ── Graph ────────────────────────────────────────────────────────

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(TemplateGenState)

        workflow.add_node("vision_analyzer", self._vision_analyzer)
        workflow.add_node("layout_generator", self._layout_generator)
        workflow.add_node("variable_extractor", self._variable_extractor)
        workflow.add_node("image_source", self._image_source)
        workflow.add_node("review", self._review_agent)

        workflow.add_edge(START, "vision_analyzer")
        workflow.add_edge("vision_analyzer", "layout_generator")
        workflow.add_edge("layout_generator", "variable_extractor")
        workflow.add_edge("variable_extractor", "image_source")
        workflow.add_edge("image_source", "review")

        workflow.add_conditional_edges(
            "review",
            self._route_after_review,
            {
                "regenerate": "layout_generator",
                "done": END,
            },
        )

        return workflow.compile(checkpointer=None, debug=False)

    def _route_after_review(self, state: TemplateGenState) -> str:
        if state.get("review_passed", False):
            return "done"
        if state.get("regeneration_count", 0) >= MAX_REGENERATIONS:
            logger.warning("Max regenerations reached, accepting current output")
            return "done"
        return "regenerate"

    # ── Agent 1: Vision Analyzer (Gemini) ────────────────────────────

    def _vision_analyzer(self, state: TemplateGenState) -> dict:
        """Analyze uploaded image to extract layout specification."""
        self._ensure_gemini()
        logger.info("🔍 Vision Analyzer: analyzing uploaded image...")

        image_bytes = base64.b64decode(state["upload_image_b64"])
        template_type = state.get("template_type", "image")

        prompt = f"""Analyze this social media {'carousel slide' if template_type == 'carousel' else 'image'} template and extract its PRECISE design specification as JSON.

CRITICAL: All size values MUST be plain integers or decimals — NOT strings with units. E.g. heading_size_px: 56 NOT "56px".

Return a JSON object with EXACTLY these fields:
{{
  "template_name": "short descriptive name for this template style",
  "category": "one of: quote, stat, tips, story, listicle, announcement, comparison, checklist, how-to, educational",
  "slide_count": 1,
  "color_palette": {{
    "background": "#hexvalue",
    "primary_text": "#hexvalue",
    "secondary_text": "#hexvalue",
    "accent": "#hexvalue"
  }},
  "typography": {{
    "font_family": "Inter",
    "heading_size_px": 56,
    "heading_weight": 800,
    "heading_line_height": 1.1,
    "heading_letter_spacing_em": -0.02,
    "body_size_px": 18,
    "body_weight": 400,
    "body_line_height": 1.6,
    "caption_size_px": 14,
    "text_transform": "none"
  }},
  "spacing": {{
    "container_padding_px": 48,
    "element_gap_px": 24,
    "section_gap_px": 40
  }},
  "effects": {{
    "card_border_radius_px": 16,
    "card_shadow": "0 4px 20px rgba(0,0,0,0.15)",
    "overlay_opacity": 0.4,
    "border_width_px": 0,
    "border_color": "none"
  }},
  "decorative": {{
    "has_geometric_shapes": true,
    "has_gradient": false,
    "gradient_direction": "135deg",
    "gradient_colors": ["#6366f1", "#8b5cf6"]
  }},
  "layout": {{
    "structure": "describe the layout precisely (e.g. centered text on dark background, split columns, card with accent header)",
    "alignment": "center"
  }},
  "zones": [
    {{
      "type": "heading_text | body_text | image | profile_pic | icon | decorative | badge | cta_button",
      "description": "what this zone contains",
      "position": "top, center, bottom, left, right",
      "width_percent": 80,
      "height_px": 200
    }}
  ],
  "image_zones": [
    {{
      "description": "what type of image is in this area (e.g. abstract gradient, professional workspace, nature photo).",
      "is_background": true,
      "unsplash_query": "search query for a similar stock photo",
      "position": "background, center, left, etc"
    }}
  ],
  "has_profile_pic": false,
  "decorative_elements": ["list of decorative elements like dots, lines, shapes, glow effects"]
}}

CRITICAL RULES:
1. All size values MUST be integers (not strings). heading_size_px: 56 NOT "56px".
2. font_family MUST be a valid Google Fonts name (Inter, Playfair Display, Montserrat, Roboto, Lato, etc.).
3. Extract exact hex color values from the image — do not approximate.
4. For spacing/effects: measure or estimate precise pixel values, not vague descriptions.
5. CRITICAL INSTRUCTIONS FOR `image_zones`:
   - If the background is a solid color, DO NOT add it to `image_zones` at all.
   - If the background is an abstract pattern, gradient, or simple shape composition, set `is_background: true`. (This routes to our AI pattern generator).
   - If the background is a REAL PHOTOGRAPH, SCENE, OR COMPLEX IMAGE (like a cityscape, office, or person), set `is_background: false` so it is treated as a regular placeholder image sourced from Unsplash. Do not send complex photo descriptions to the abstract background generator.
The goal is to recreate this design as an editable HTML/CSS template with maximum fidelity."""

        try:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                resp = pool.submit(
                    lambda: self._gemini_client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=[
                            types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                            prompt,
                        ],
                        config=types.GenerateContentConfig(
                            temperature=0.2,
                            response_mime_type="application/json",
                        ),
                    )
                ).result(timeout=60)

            spec = json.loads(resp.text)
            logger.info(f"✅ Vision Analyzer: extracted layout spec - {spec.get('template_name', 'unnamed')}")

            # Extract image queries for Unsplash
            image_queries = []
            bg_descriptions = []
            for zone in spec.get("image_zones", []):
                if zone.get("is_background"):
                    bg_descriptions.append(zone.get("description", "abstract background"))
                else:
                    image_queries.append(zone.get("unsplash_query", zone.get("description", "professional")))

            # Use pre-seeded slide count (e.g. from PDF page count) when available,
            # since Gemini sees a stacked PNG and often underestimates slide_count.
            preseeded_count = state.get("detected_slide_count", 1)
            vision_count = spec.get("slide_count", 1)
            final_slide_count = preseeded_count if preseeded_count > 1 else vision_count
            if preseeded_count > 1 and vision_count != preseeded_count:
                logger.info(
                    f"📌 Using pre-seeded slide count {preseeded_count} "
                    f"(Vision Analyzer guessed {vision_count})"
                )

            return {
                "layout_spec": spec,
                "image_queries": image_queries,
                "bg_descriptions": bg_descriptions,
                "has_profile_pic": spec.get("has_profile_pic", False),
                "detected_slide_count": final_slide_count,
                "template_name": spec.get("template_name", "Untitled Template"),
                "template_category": spec.get("category", "quote"),
            }

        except Exception as e:
            logger.error(f"Vision Analyzer failed: {e}")
            return {
                "errors": [f"Vision analysis failed: {str(e)}"],
                "layout_spec": {},
                "image_queries": [],
                "bg_descriptions": [],
                "has_profile_pic": False,
                "detected_slide_count": state.get("detected_slide_count", 1),
                "template_name": "Untitled Template",
                "template_category": "quote",
            }

    # ── Agent 2: Layout Generator (Claude) ───────────────────────────

    def _layout_generator(self, state: TemplateGenState) -> dict:
        """Generate HTML/CSS template from layout specification.

        For image templates: returns a single html_template with {{variable}} slots.
        For carousel templates: returns a slides[] array, each with its own
        html_structure and variable_schema (one per slide).
        """
        self._ensure_claude()
        spec = state.get("layout_spec", {})
        has_profile_pic = state.get("has_profile_pic", False)
        review_feedback = state.get("review_feedback", "")
        template_type = state.get("template_type", "image")
        aspect_ratio = state.get("aspect_ratio", "1:1")
        detected_slide_count = state.get("detected_slide_count", 1)
        upload_image_b64 = state.get("upload_image_b64", "")
        logger.info(f"🎨 Layout Generator: creating HTML/CSS template (type={template_type})...")

        feedback_section = ""
        if review_feedback:
            feedback_section = f"""

PREVIOUS ATTEMPT FEEDBACK — Fix these issues:
{review_feedback}
"""

        profile_pic_html = ""
        if has_profile_pic:
            profile_pic_html = """Include a PROFILE PIC PLACEHOLDER using this exact pattern, exposing the URL as an image variable (section: "Images"):
<div class="profile-pic" style="width:80px;height:80px;border-radius:50%;overflow:hidden;background:#E2E8F0;display:flex;align-items:center;justify-content:center;">
  <img src="{{profile_image_url}}" style="width:100%;height:100%;object-fit:cover">
</div>
"""

        has_image = bool(upload_image_b64)

        # Choose prompt based on template type
        if template_type == "carousel":
            prompt = ""
        else:
            prompt = self._build_image_layout_prompt(
                spec=spec,
                aspect_ratio=aspect_ratio,
                profile_pic_html=profile_pic_html,
                feedback_section=feedback_section,
                has_image=has_image,
            )

        def _parse_llm_json(raw_text: str, context: str = "") -> dict:
            """Parse LLM JSON output with fallbacks. Strips malformed variable entries."""
            import re as _re
            import dirtyjson as _dirtyjson

            match = _re.search(r'```(?:json)?\s*(.*?)\s*```', raw_text, _re.DOTALL)
            if match:
                raw_text = match.group(1)
            else:
                raw_text = raw_text.strip()
                start_idx = raw_text.find('{')
                end_idx = raw_text.rfind('}')
                if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
                    raw_text = raw_text[start_idx:end_idx+1]
                elif start_idx != -1:
                    raw_text = raw_text[start_idx:]

            try:
                parsed = json.loads(raw_text)
            except json.JSONDecodeError as e:
                logger.warning(f"Standard JSON parse failed{f' for {context}' if context else ''}, trying dirtyjson: {e}")
                try:
                    parsed = dict(_dirtyjson.loads(raw_text))
                except Exception as dirty_e:
                    logger.error(f"dirtyjson fallback failed{f' for {context}' if context else ''}: {dirty_e}")
                    return {}

            # Post-parse: strip variable schema entries missing required 'type' field
            for schema_key in ("variables_schema", "variable_schema"):
                schema = parsed.get(schema_key, {})
                if isinstance(schema, dict):
                    invalid = [k for k, v in schema.items() if not isinstance(v, dict) or "type" not in v]
                    for k in invalid:
                        logger.warning(f"Stripping malformed variable '{k}' from schema (missing 'type')")
                        del schema[k]

            return parsed
        
        def _parse_html_only(raw_text: str) -> str:
            # We just want the raw HTML string
            start = raw_text.find('<!DOCTYPE html>')
            if start == -1:
                start = raw_text.find('<div')
            end = raw_text.rfind('</html>')
            if end != -1:
                return raw_text[start:end+7].strip()
            return raw_text.strip()

        try:
            if template_type == "carousel":
                import dirtyjson

                logger.info(f"🚀 Generating {detected_slide_count} carousel slides sequentially...")

                def _generate_single_slide(slide_num: int, pass_image: bool = False) -> dict:
                    sprompt = self._build_single_slide_layout_prompt(
                        spec=spec,
                        slide_number=slide_num,
                        total_slides=detected_slide_count,
                        profile_pic_html=profile_pic_html,
                        feedback_section=feedback_section,
                        has_image=pass_image,
                    )
                    # Only pass the image for slide 1 to control token cost
                    img_b64 = upload_image_b64 if pass_image else ""
                    raw_text = self._invoke_layout_llm(sprompt, image_b64=img_b64)
                    return {"html_structure": _parse_html_only(raw_text)}

                slides = []

                # Execute slide generation with bounded concurrency to prevent browser timeouts (300s)
                # while avoiding AWS Bedrock ThrottlingExceptions
                results_array = [None] * detected_slide_count
                import concurrent.futures
                
                with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                    future_to_idx = {
                        executor.submit(_generate_single_slide, i, (i == 1 and has_image)): i - 1
                        for i in range(1, detected_slide_count + 1)
                    }
                    for future in concurrent.futures.as_completed(future_to_idx):
                        idx = future_to_idx[future]
                        try:
                            results_array[idx] = future.result()
                            logger.info(f"✅ Finished generating slide {idx + 1}/{detected_slide_count}")
                        except Exception as e:
                            logger.error(f"❌ Error generating slide {idx + 1}: {e}")
                
                results = [r for r in results_array if r is not None]

                for res in results:
                    if res and "html_structure" in res:
                        slides.append(res)

                if not slides:
                    raise Exception("Failed to generate any valid slides. LLM might have returned malformed data.")

                logger.info(f"✅ Layout Generator: produced {len(slides)} carousel slides")
                first_html = slides[0].get("html_structure", "")

                return {
                    "slides": slides,
                    "html_template": first_html,
                    "variables_schema": {},
                    "default_values": {},
                }
            else:
                raw_text = self._invoke_layout_llm(prompt, image_b64=upload_image_b64)
                html_code = _parse_html_only(raw_text)

                if not html_code:
                    raise Exception("Layout generator returned empty or unparseable response")

                logger.info(f"✅ Layout Generator: produced HTML template ({len(html_code)} chars)")
                return {
                    "slides": [],
                    "html_template": html_code,
                    "variables_schema": {},
                    "default_values": {},
                }

        except Exception as e:
            logger.error(f"Layout Generator failed: {e}", exc_info=True)
            return {"errors": [f"Layout generation failed: {str(e)}"]}

    # ── Agent 2.5: Variable Extractor (Gemini) ───────────────────────────

    def _variable_extractor(self, state: TemplateGenState) -> dict:
        """Analyze HTML structure, replace CSS rules with {{variables}}, and return Schema JSON."""
        self._ensure_gemini()
        template_type = state.get("template_type", "image")
        slides = state.get("slides", [])
        html_template = state.get("html_template", "")
        detected_slide_count = state.get("detected_slide_count", 1)

        logger.info(f"🔍 Variable Extractor: generating variables schema for {template_type}...")

        def _parse_llm_json(raw_text: str, context: str = "") -> dict:
            import re as _re
            import dirtyjson as _dirtyjson

            match = _re.search(r'```(?:json)?\s*(.*?)\s*```', raw_text, _re.DOTALL)
            if match:
                raw_text = match.group(1)
            else:
                raw_text = raw_text.strip()
                start_idx = raw_text.find('{')
                end_idx = raw_text.rfind('}')
                if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
                    raw_text = raw_text[start_idx:end_idx+1]
                elif start_idx != -1:
                    raw_text = raw_text[start_idx:]

            try:
                parsed = json.loads(raw_text)
            except json.JSONDecodeError as e:
                logger.warning(f"Standard JSON parse failed, trying dirtyjson: {e}")
                try:
                    parsed = dict(_dirtyjson.loads(raw_text))
                except Exception as dirty_e:
                    logger.error(f"dirtyjson fallback failed: {dirty_e}")
                    return {}

            # Post-parse: strip variable schema entries missing required 'type' field
            for schema_key in ("variables_schema", "variable_schema"):
                schema = parsed.get(schema_key, {})
                if isinstance(schema, dict):
                    invalid = [k for k, v in schema.items() if not isinstance(v, dict) or "type" not in v]
                    for k in invalid:
                        logger.warning(f"Stripping malformed variable '{k}' from schema (missing 'type')")
                        del schema[k]

            return parsed
        
        system_instruction = '''You are an expert Frontend Developer and Template Configurator.
You will be provided with a raw HTML/CSS Template.
Your job is to identify editable elements (Colors, text values, font sizes, image URLs).
You must RE-WRITE the HTML string to use {{variable_name}} double-brace placeholders for those values.

Then, you must construct a JSON definition containing the variables schema and default values.
For carousel templates, you must process multiple slide structures.

MANDATORY SHARED VARIABLES:
- bg_color (type: color, label: "Background Color", required: true)
- primary_color (type: color, label: "Primary Color", required: true)
- text_color (type: color, label: "Text Color", required: true)
- heading_color (type: color, label: "Heading Color", required: true)
- heading_font_size (type: number, unit: "px", min: 16, max: 120, step: 1, required: true)
- body_font_size (type: number, unit: "px", min: 10, max: 48, step: 1, required: true)

SLIDE-SPECIFIC VARIABLES (MUST have `_slideN` suffix e.g. `headline_slide1`):
- headline_slideN (type: textarea)
- body_text_slideN (type: textarea)
- bg_image_slideN (type: image)

Return EXACTLY a JSON Object with this format:
For single images:
{
  "html_template": "<!DOCTYPE html>...(HTML WITH {{variables}})",
  "variables_schema": { "bg_color": { "type": "color", "label": "Bg Color", "section": "Colors" } },
  "default_values": { "bg_color": "#ffffff" }
}

For Carousels:
{
  "slides": [
    {
       "html_structure": "<!DOCTYPE html>...(HTML WITH {{variables}})",
       "variable_schema": { "headline_slide1": { "type": "textarea", "section": "Content" } },
       "default_values": { "headline_slide1": "Hello" }
    }
  ],
  "variables_schema": { "bg_color": { "type": "color" } }, 
  "default_values": { "bg_color": "#ffffff" }
}
'''
        
        try:
            import concurrent.futures
            
            if template_type == "carousel":
                input_payload = {
                     "instructions": "Extract templates for these carousel slides and identify common global variables as well.",
                     "slides": slides,
                }
            else:
               input_payload = {
                    "instructions": "Extract template for this single graphic.",
                    "html_template": html_template,
               }
               
            prompt = json.dumps(input_payload, indent=2)

            with concurrent.futures.ThreadPoolExecutor() as pool:
                resp = pool.submit(
                    lambda: self._gemini_client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=[prompt],
                        config=types.GenerateContentConfig(
                            temperature=0.1,
                            system_instruction=system_instruction,
                            response_mime_type="application/json",
                        ),
                    )
                ).result(timeout=120)
                
            raw_text = resp.text
            result = _parse_llm_json(raw_text)

            if not result:
                raise Exception("Variable Extractor returned empty or unparseable response")

            if template_type == "carousel":
                 merged_schema = result.get("variables_schema", {})
                 merged_defaults = result.get("default_values", {})
                 slides = result.get("slides", [])

                 for slide in slides:
                     merged_schema.update(slide.get("variable_schema", slide.get("variables_schema", {})))
                     merged_defaults.update(slide.get("default_values", {}))

                 return {
                    "slides": slides,
                    "variables_schema": merged_schema,
                    "default_values": merged_defaults,
                 }
            else:
                 return {
                    "html_template": result.get("html_template", ""),
                    "variables_schema": result.get("variables_schema", {}),
                    "default_values": result.get("default_values", {}),
                 }

        except Exception as e:
            logger.error(f"Variable Extractor failed: {e}", exc_info=True)
            return {"errors": [f"Variable Extractor failed: {str(e)}"]}

    def _build_image_layout_prompt(self, spec: dict, aspect_ratio: str, profile_pic_html: str, feedback_section: str, has_image: bool = False) -> str:
        """Build layout generation prompt for single-image templates."""
        dimensions = "1080x1080"
        dim_w, dim_h = 1080, 1080
        if aspect_ratio == "16:9":
            dimensions = "1920x1080"
            dim_w, dim_h = 1920, 1080
        elif aspect_ratio == "9:16":
            dimensions = "1080x1920"
            dim_w, dim_h = 1080, 1920

        image_context = ""
        if has_image:
            image_context = """You are viewing the ORIGINAL DESIGN IMAGE above. Use it as the PRIMARY reference for layout, colors, typography, and spacing.
The JSON spec below is a machine-extracted interpretation — if any detail conflicts with what you see in the image, TRUST THE IMAGE.

"""

        font_family = spec.get("typography", {}).get("font_family", "Inter")
        # Build Google Fonts import with the detected font
        font_import = f"https://fonts.googleapis.com/css2?family={font_family.replace(' ', '+')}:wght@400;500;600;700;800;900&display=swap"

        return f"""{image_context}You are an expert HTML/CSS designer specializing in social media templates.

Given this design specification, create a complete, self-contained HTML/CSS template that EXACTLY matches the original design.

DESIGN SPECIFICATION:
{json.dumps(spec, indent=2)}

REQUIREMENTS:
1. Create a SINGLE HTML file with embedded CSS (no external dependencies except Google Fonts)
2. Import the detected font: `@import url('{font_import}');`
3. Set body dimensions to exactly {dimensions} (width: {dim_w}px, height: {dim_h}px)
4. Use `{{{{variable_name}}}}` double-brace syntax for ALL editable content

MANDATORY VARIABLES — You MUST include ALL of these in variables_schema:

COLORS (section: "Colors") — NEVER hardcode hex values in CSS:
- bg_color — Background color (type: color, label: "Background Color", required: true)
- primary_color — Primary brand/accent color (type: color, label: "Primary Color", required: true)
- text_color — Main body text color (type: color, label: "Text Color", required: true)
- heading_color — Heading color if different from body (type: color, label: "Heading Color", required: true)
- If a secondary/accent exists: secondary_color (type: color, label: "Secondary Color")

TYPOGRAPHY (section: "Typography") — sizes as plain numbers, CSS adds the unit:
- heading_font_size — (type: number, label: "Heading Size", unit: "px", min: 16, max: 120, step: 1, required: true)
- body_font_size — (type: number, label: "Body Font Size", unit: "px", min: 10, max: 48, step: 1, required: true)
- heading_line_height — (type: number, label: "Heading Line Height", unit: "ratio", min: 0.8, max: 3.0, step: 0.05, required: true)
- heading_letter_spacing — (type: number, label: "Letter Spacing", unit: "em", min: -0.1, max: 0.5, step: 0.01, required: true)
- heading_font_weight — (type: select, label: "Heading Weight", options: ["400","500","600","700","800","900"], required: true)

LAYOUT (section: "Layout"):
- container_padding — (type: number, label: "Container Padding", unit: "px", min: 0, max: 120, step: 4, required: true)
- border_radius — (type: number, label: "Border Radius", unit: "px", min: 0, max: 60, step: 2, required: true)
- element_gap — (type: number, label: "Element Gap", unit: "px", min: 0, max: 80, step: 4) [include if card/grid layout]
- overlay_opacity — (type: number, label: "Overlay Opacity", unit: "ratio", min: 0, max: 1, step: 0.05) [include ONLY if there is an image overlay]

CONTENT (section: "Content") — for all text content in this specific design:
- headline, body_text, cta_text, stat_number, author_name, quote_text, etc. as appropriate
- Use type "text" for short text (<80 chars), "textarea" for longer content

IMAGES (section: "Images") — for all image variables:
- bg_image, logo_url, profile_image_url, etc. (type: "image")

CRITICAL CSS VARIABLE BINDING RULE — this is non-negotiable for live preview:
On the outermost wrapper element (a <div> wrapping all content), bind ALL color AND number variables as CSS custom properties in the inline style attribute:
`style="--bg-color: {{{{bg_color}}}}; --primary-color: {{{{primary_color}}}}; --text-color: {{{{text_color}}}}; --heading-color: {{{{heading_color}}}}; --heading-size: {{{{heading_font_size}}}}px; --body-size: {{{{body_font_size}}}}px; --line-height: {{{{heading_line_height}}}}; --letter-spacing: {{{{heading_letter_spacing}}}}em; --font-weight: {{{{heading_font_weight}}}}; --padding: {{{{container_padding}}}}px; --radius: {{{{border_radius}}}}px;"`

Then in your <style> block, use ONLY var() references — NEVER hardcode hex values or pixel sizes directly:
  background-color: var(--bg-color);
  color: var(--text-color);
  font-size: var(--heading-size);
  line-height: var(--line-height);
  letter-spacing: var(--letter-spacing);
  border-radius: var(--radius);
  padding: var(--padding);

5. Replicate the layout structure, spacing, and visual hierarchy PRECISELY from the spec
{profile_pic_html}
6. Limit full-frame background images; prefer CSS layouts (splits, cards, grids) with `<img>` tags for photos
7. Include decorative elements (dots, lines, shapes, gradients) as pure CSS
8. The template MUST look professional, polished, and production-ready — match the original's visual quality
9. Use overflow:hidden on body to prevent scrollbars
{feedback_section}

Return ONLY the complete HTML string. Do NOT output markdown, JSON, or any conversational text.

<!DOCTYPE html>
<html>
<!-- your template here -->
</html>
"""

    def _build_single_slide_layout_prompt(
        self, spec: dict, slide_number: int, total_slides: int, profile_pic_html: str, feedback_section: str, has_image: bool = False
    ) -> str:
        """Build layout generation prompt for a single carousel slide."""
        font_family = spec.get("typography", {}).get("font_family", "Inter")
        font_import = f"https://fonts.googleapis.com/css2?family={font_family.replace(' ', '+')}:wght@400;500;600;700;800;900&display=swap"

        slide_role = "hook/attention-grabber"
        if slide_number == total_slides:
            slide_role = "CTA/call-to-action (close with a strong offer or next step)"
        elif slide_number > 1:
            slide_role = "content slide (deliver value, tip, or step)"

        image_context = ""
        if has_image:
            image_context = """You are viewing the ORIGINAL DESIGN IMAGE above. Use it as the PRIMARY reference.
The JSON spec is a machine-extracted interpretation — if any detail conflicts with the image, TRUST THE IMAGE.

"""

        return f"""{image_context}You are an expert HTML/CSS designer specializing in social media carousel templates.

Create the HTML/CSS template for SLIDE #{slide_number} of {total_slides} in a carousel.
This slide's role: {slide_role}
The slide must be a SEPARATE, SELF-CONTAINED HTML document rendered at 1080x1350 pixels.

DESIGN SPECIFICATION:
{json.dumps(spec, indent=2)}

VARIABLE NAMING RULES:
- Shared theme variables (colors, typography, layout): use standard names WITHOUT slide suffix (e.g. {{{{bg_color}}}}, {{{{primary_color}}}}, {{{{heading_font_size}}}})
- Slide-specific content: append `_slide{slide_number}` suffix (e.g. {{{{headline_slide{slide_number}}}}}, {{{{body_text_slide{slide_number}}}}})
- Slide tracker/badge: MUST use slide suffix e.g. {{{{slide_badge_slide{slide_number}}}}} — NEVER generic {{{{slide_number}}}}

MANDATORY SHARED VARIABLES (no suffix — include in ALL slides):

COLORS (section: "Colors") — NEVER hardcode hex values in CSS:
- bg_color (type: color, label: "Background Color", required: true)
- primary_color (type: color, label: "Primary Color", required: true)
- text_color (type: color, label: "Text Color", required: true)
- heading_color (type: color, label: "Heading Color", required: true)

TYPOGRAPHY (section: "Typography"):
- heading_font_size (type: number, label: "Heading Size", unit: "px", min: 16, max: 120, step: 1, required: true)
- body_font_size (type: number, label: "Body Font Size", unit: "px", min: 10, max: 48, step: 1, required: true)
- heading_line_height (type: number, label: "Heading Line Height", unit: "ratio", min: 0.8, max: 3.0, step: 0.05)
- heading_letter_spacing (type: number, label: "Letter Spacing", unit: "em", min: -0.1, max: 0.5, step: 0.01)
- heading_font_weight (type: select, label: "Heading Weight", options: ["400","500","600","700","800","900"])

LAYOUT (section: "Layout"):
- container_padding (type: number, label: "Container Padding", unit: "px", min: 0, max: 120, step: 4, required: true)
- border_radius (type: number, label: "Border Radius", unit: "px", min: 0, max: 60, step: 2, required: true)

SLIDE-SPECIFIC VARIABLES (with _slide{slide_number} suffix):
- headline_slide{slide_number} (type: textarea, label: "Headline", section: "Content", required: true)
- body_text_slide{slide_number} (type: textarea, label: "Body Text", section: "Content") — if this slide has body copy
- cta_text_slide{slide_number} (type: text, label: "CTA Text", section: "Content") — for last slide CTA
- bg_image_slide{slide_number} (type: image, label: "Background Image", section: "Images") — if slide has an image

CRITICAL CSS VARIABLE BINDING (non-negotiable for live preview):
On the outermost wrapper <div>, bind ALL shared variables as CSS custom properties:
`style="--bg-color: {{{{bg_color}}}}; --primary-color: {{{{primary_color}}}}; --text-color: {{{{text_color}}}}; --heading-color: {{{{heading_color}}}}; --heading-size: {{{{heading_font_size}}}}px; --body-size: {{{{body_font_size}}}}px; --line-height: {{{{heading_line_height}}}}; --letter-spacing: {{{{heading_letter_spacing}}}}em; --font-weight: {{{{heading_font_weight}}}}; --padding: {{{{container_padding}}}}px; --radius: {{{{border_radius}}}}px;"`

In <style>, use ONLY var() references — NEVER hardcode hex values or sizes:
  background-color: var(--bg-color); color: var(--text-color);
  font-size: var(--heading-size); border-radius: var(--radius);

1. Import font: `@import url('{font_import}');`
2. Set body: width: 1080px; height: 1350px; overflow: hidden;
{profile_pic_html}
3. Limit full-frame background images; prefer CSS card layouts
4. Include decorative elements as pure CSS
{feedback_section}

Return ONLY the complete HTML string. Do NOT output markdown, JSON, or any conversational text.

<!DOCTYPE html>
<html>
<!-- your template here -->
</html>
"""

    def _invoke_layout_llm(self, prompt: str, image_b64: str = "") -> str:
        """Invoke Claude (or Gemini fallback) for layout generation. Returns raw text.

        If image_b64 is provided, sends a multimodal message with the image as the
        primary reference alongside the text prompt.
        """
        import concurrent.futures
        from langchain_core.messages import HumanMessage

        if self._claude_llm:
            if image_b64:
                # Multimodal: image + text (Bedrock Converse API format)
                content = [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ]
                msg = [HumanMessage(content=content)]
            else:
                msg = prompt

            with concurrent.futures.ThreadPoolExecutor() as pool:
                resp = pool.submit(
                    lambda m=msg: self._claude_llm.invoke(m)
                ).result(timeout=600)
            raw_text = resp.content
            if isinstance(raw_text, list):
                raw_text = "\n".join(
                    block.text if hasattr(block, "text") else str(block)
                    for block in raw_text
                    if hasattr(block, "text")
                )
            return raw_text
        else:
            # Fallback to Gemini (also supports multimodal)
            self._ensure_gemini()
            contents = []
            if image_b64:
                img_bytes = base64.b64decode(image_b64)
                contents.append(types.Part.from_bytes(data=img_bytes, mime_type="image/png"))
            contents.append(prompt)
            with concurrent.futures.ThreadPoolExecutor() as pool:
                resp = pool.submit(
                    lambda: self._gemini_client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=contents,
                        config=types.GenerateContentConfig(
                            temperature=0.3,
                            max_output_tokens=8000,
                            response_mime_type="application/json",
                        ),
                    )
                ).result(timeout=600)
            return resp.text

    # ── Agent 3: Image Source (Unsplash + Nano Banana) ───────────────

    def _image_source(self, state: TemplateGenState) -> dict:
        """Fetch placeholder images from Unsplash + generate backgrounds via Nano Banana."""
        logger.info("🖼️ Image Source: fetching/generating placeholder images...")

        image_queries = state.get("image_queries", [])
        bg_descriptions = state.get("bg_descriptions", [])
        placeholder_urls = {}

        import concurrent.futures

        # 1) Unsplash for stock photo placeholders
        if image_queries:
            from app.services.unsplash_service import get_unsplash_service
            unsplash = get_unsplash_service()

            for i, query in enumerate(image_queries):
                try:
                    loop = asyncio.new_event_loop()
                    url = loop.run_until_complete(unsplash.get_photo_url(query))
                    loop.close()
                    if url:
                        var_name = f"placeholder_image_{i + 1}"
                        placeholder_urls[var_name] = url
                        logger.info(f"  📸 Unsplash: '{query}' → got photo")
                except Exception as e:
                    logger.warning(f"  ⚠️ Unsplash search failed for '{query}': {e}")

        # 2) Nano Banana for abstract/custom backgrounds
        if bg_descriptions:
            self._ensure_gemini()
            for i, desc in enumerate(bg_descriptions):
                try:
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        resp = pool.submit(
                            lambda d=desc: self._gemini_client.models.generate_content(
                                model="gemini-2.5-flash-image",
                                contents=[
                                    f"Generate a clean, professional abstract background image for a social media template. "
                                    f"Style: {d}. No text, no logos, no faces. Just a beautiful background pattern or gradient. "
                                    f"High resolution, suitable for a 1080x1080 social media post."
                                ],
                                config=types.GenerateContentConfig(
                                    response_modalities=["Image"],
                                    image_config=types.ImageConfig(aspect_ratio="1:1"),
                                ),
                            )
                        ).result(timeout=60)

                    # Extract image and upload to S3
                    try:
                        # Depending on the SDK version and response format, the data could be nested
                        img_bytes = None
                        
                        if hasattr(resp, "parts") and resp.parts:
                            part = resp.parts[0]
                            if hasattr(part, "inline_data") and part.inline_data:
                                img_bytes = part.inline_data.data
                        elif hasattr(resp, "candidates") and resp.candidates:
                            candidate = resp.candidates[0]
                            if hasattr(candidate, "content") and hasattr(candidate.content, "parts") and candidate.content.parts:
                                part = candidate.content.parts[0]
                                if hasattr(part, "inline_data") and part.inline_data:
                                    img_bytes = part.inline_data.data
                                    
                        if not img_bytes:
                            logger.warning(f"⚠️ Nano Banana: No image data found in response for '{desc}'")
                            raise ValueError("No image data found in Nano Banana response")
                            
                        import base64
                        if isinstance(img_bytes, str):
                            img_bytes = base64.b64decode(img_bytes)

                        # Upload to storage
                        try:
                            loop = asyncio.new_event_loop()
                            from app.services.storage_service import get_storage_service
                            storage = get_storage_service()
                            url, key = loop.run_until_complete(
                                storage.upload_image(
                                    file_bytes=img_bytes,
                                    content_type="image/png",
                                    prefix="template-bg",
                                )
                            )
                            loop.close()
                            var_name = f"bg_image_{i + 1}"
                            placeholder_urls[var_name] = url
                            logger.info(f"  🎨 Nano Banana: generated background → {key}")
                        except Exception as upload_err:
                            logger.warning(f"  ⚠️ S3 upload failed, using data URI: {upload_err}")
                            # Fallback: data URI
                            b64 = base64.b64encode(img_bytes).decode()
                            var_name = f"bg_image_{i + 1}"
                            placeholder_urls[var_name] = f"data:image/png;base64,{b64[:100]}..."
                            
                    except Exception as extract_err:
                        logger.warning(f"  ⚠️ Nano Banana image extraction failed: {extract_err}")
                        raise
                        
                except Exception as e:
                    logger.warning(f"  ⚠️ Nano Banana background gen failed for '{desc}': {e}. Falling back to Unsplash.")
                    try:
                        from app.services.unsplash_service import get_unsplash_service
                        unsplash = get_unsplash_service()
                        loop = asyncio.new_event_loop()
                        url = loop.run_until_complete(unsplash.get_photo_url(f"background {desc}"))
                        loop.close()
                        var_name = f"bg_image_{i + 1}"
                        placeholder_urls[var_name] = url or "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1080&q=80"
                        logger.info(f"  📸 Fallback Unsplash (Background): '{desc}' → got photo")
                    except Exception as fb_err:
                        logger.warning(f"  ⚠️ Fallback Unsplash background search failed: {fb_err}")
                        var_name = f"bg_image_{i + 1}"
                        placeholder_urls[var_name] = "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1080&q=80"

        # Inject URLs into default_values
        current_defaults = dict(state.get("default_values", {}))
        current_defaults.update(placeholder_urls)

        logger.info(f"✅ Image Source: {len(placeholder_urls)} placeholder images sourced")
        return {
            "placeholder_urls": placeholder_urls,
            "default_values": current_defaults,
        }

    # ── Agent 4: Review Agent (Gemini) ───────────────────────────────

    def _review_agent(self, state: TemplateGenState) -> dict:
        """Review the generated template for quality using Claude (Gemini fallback)."""
        self._ensure_claude()
        if not self._claude_llm:
            self._ensure_gemini()
        html = state.get("html_template", "")
        logger.info("🔎 Review Agent: validating generated template...")

        if not html:
            return {
                "review_passed": False,
                "review_feedback": "No HTML template was generated.",
                "regeneration_count": state.get("regeneration_count", 0) + 1,
            }

        # Extract the most review-relevant sections (avoids truncating mid-CSS)
        import re
        style_match = re.search(r'<style[^>]*>(.*?)</style>', html, re.DOTALL | re.IGNORECASE)
        css_block = style_match.group(1)[:4000] if style_match else html[:2000]
        root_style_match = re.search(
            r'<(?:div|section|main|body)[^>]*style=["\']([^"\']{0,800})', html
        )
        root_style = root_style_match.group(1) if root_style_match else "NOT FOUND"
        template_vars_in_html = sorted(set(re.findall(r'\{\{([^}]+)\}\}', html)))
        schema_keys = sorted(state.get('variables_schema', {}).keys())

        mandatory_vars = [
            "bg_color", "primary_color", "text_color", "heading_color",
            "heading_font_size", "body_font_size",
        ]
        missing_mandatory = [v for v in mandatory_vars if v not in schema_keys]

        prompt = f"""You are a senior frontend design reviewer. Audit this HTML/CSS social media template.

CSS BLOCK (from <style> tag):
{css_block}

ROOT ELEMENT INLINE STYLE (CSS variable bindings):
{root_style}

ALL {{{{variables}}}} FOUND IN HTML:
{json.dumps(template_vars_in_html)}

VARIABLES SCHEMA KEYS DEFINED:
{json.dumps(schema_keys)}

MANDATORY VARIABLES THAT MUST EXIST: {json.dumps(mandatory_vars)}
MANDATORY VARIABLES CURRENTLY MISSING: {json.dumps(missing_mandatory)}

ORIGINAL DESIGN SPEC:
{json.dumps(state.get('layout_spec', {}), indent=2)}

Score each criterion 0-2 points (10 points total):
1. CSS VARIABLE BINDING (0-2): Every color variable (bg_color, primary_color, text_color, heading_color etc.) MUST appear in the root element's inline style= binding AND be referenced via var() in CSS. Hardcoded hex values anywhere in CSS = 0 points.
2. VARIABLE COVERAGE (0-2): All mandatory variables (bg_color, primary_color, text_color, heading_color, heading_font_size, body_font_size) are in the schema. Missing any = 0 points.
3. SCHEMA QUALITY (0-2): Each variable in schema has label, section, unit fields where applicable (numbers need unit, colors don't need unit). Missing these metadata fields = 1 point. All present = 2 points.
4. TEMPLATE FIDELITY (0-2): The CSS layout matches the original spec's described structure and visual hierarchy. Rough match = 1, accurate match = 2.
5. CSS CORRECTNESS (0-2): Font @import present. Body dimensions set. No broken var() references (a var() used in CSS but not bound in root style = broken). All good = 2.

FAIL CONDITIONS (set pass: false regardless of score):
- missing_variables is non-empty (mandatory vars absent)
- hardcoded_colors is non-empty (hex values found directly in CSS)

Return JSON:
{{
  "pass": true,
  "score": 1-10,
  "issues": ["Specific actionable issues to fix in next regeneration"],
  "missing_variables": ["list of mandatory vars that are missing from schema"],
  "hardcoded_colors": ["#1a2b3c found hardcoded in .card background-color"],
  "css_binding_issues": ["--primary-color not bound in root style but used in CSS"]
}}"""

        try:
            import concurrent.futures
            if self._claude_llm:
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    resp = pool.submit(
                        lambda: self._claude_llm.invoke(prompt)
                    ).result(timeout=90)
                raw_text = resp.content
                if isinstance(raw_text, list):
                    raw_text = "\n".join(
                        block.text if hasattr(block, "text") else str(block)
                        for block in raw_text
                        if hasattr(block, "text")
                    )
            else:
                # Gemini fallback
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    resp = pool.submit(
                        lambda: self._gemini_client.models.generate_content(
                            model="gemini-2.5-flash",
                            contents=[prompt],
                            config=types.GenerateContentConfig(
                                temperature=0.2,
                                response_mime_type="application/json",
                            ),
                        )
                    ).result(timeout=90)
                raw_text = resp.text

            match = re.search(r'```(?:json)?\s*(.*?)\s*```', raw_text, re.DOTALL)
            if match:
                raw_text = match.group(1)
            else:
                raw_text = raw_text.strip()
                start_idx = raw_text.find('{')
                end_idx = raw_text.rfind('}')
                if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
                    raw_text = raw_text[start_idx:end_idx+1]

            review = json.loads(raw_text)
            score = review.get("score", 7)
            missing_vars = review.get("missing_variables", [])
            hardcoded_colors = review.get("hardcoded_colors", [])
            issues = review.get("issues", [])

            # Fail if mandatory vars are missing OR hex values are hardcoded in CSS
            hard_fail = bool(missing_vars) or bool(hardcoded_colors)
            passed = review.get("pass", True) and score >= 7 and not hard_fail

            all_feedback = list(issues)
            if missing_vars:
                all_feedback.append(f"MISSING MANDATORY VARIABLES: {', '.join(missing_vars)} — add these to variables_schema with correct type/section/unit")
            if hardcoded_colors:
                all_feedback.append(f"HARDCODED COLORS FOUND: {'; '.join(hardcoded_colors)} — move all colors to CSS custom properties via var()")
            if review.get("css_binding_issues"):
                all_feedback.extend(review["css_binding_issues"])

            logger.info(
                f"{'✅' if passed else '❌'} Review Agent: "
                f"score={score}/10, missing={missing_vars}, hardcoded={len(hardcoded_colors)}, "
                f"issues={len(issues)}"
            )

            return {
                "review_passed": passed,
                "review_feedback": "\n".join(all_feedback) if not passed else "",
                "regeneration_count": state.get("regeneration_count", 0) + (0 if passed else 1),
            }

        except Exception as e:
            logger.error(f"Review Agent failed: {e}")
            # On review failure, accept the template (don't block the pipeline)
            return {
                "review_passed": True,
                "review_feedback": "",
                "regeneration_count": state.get("regeneration_count", 0),
            }

    # ── Run Pipeline ─────────────────────────────────────────────────

    async def run(
        self,
        image_bytes: bytes,
        template_type: str,
        user_id: str,
        aspect_ratio: str = "1:1",
        detected_slide_count: Optional[int] = None,
    ) -> dict:
        """Execute the LangGraph pipeline from start to finish.

        Args:
            image_bytes: Raw bytes of the uploaded image/PDF
            template_type: "image" or "carousel"
            user_id: ID of the uploading user
            aspect_ratio: "1:1", "16:9", or "9:16"
            detected_slide_count: If set, overrides the Vision Analyzer's slide count guess.
                                  Use this when the caller already knows the page count (e.g.
                                  PDF uploads, where the stacked PNG loses page boundaries).

        Returns:
            {
                "html_template": str,
                "variables_schema": dict,
                "default_values": dict,
                "template_name": str,
                "template_category": str,
                "placeholder_urls": dict,
                "has_profile_pic": bool,
                "detected_slide_count": int,
            }
        """
        initial_state: TemplateGenState = {
            "upload_image_b64": base64.b64encode(image_bytes).decode(),
            "upload_type": "image",
            "template_type": template_type,
            "user_id": user_id,
            "aspect_ratio": aspect_ratio,
            "layout_spec": None,
            "image_queries": [],
            "bg_descriptions": [],
            "has_profile_pic": False,
            "detected_slide_count": detected_slide_count if detected_slide_count is not None else 1,
            "html_template": "",
            "variables_schema": {},
            "default_values": {},
            "slides": [],
            "placeholder_urls": {},
            "review_passed": False,
            "review_feedback": "",
            "regeneration_count": 0,
            "template_name": "Untitled Template",
            "template_category": "quote",
            "errors": [],
        }

        logger.info(f"🚀 Starting template generation pipeline (type={template_type})")

        # LangGraph invoke is synchronous — run in executor
        result = await asyncio.get_event_loop().run_in_executor(
            _executor,
            lambda: self._graph.invoke(initial_state),
        )

        errors = result.get("errors", [])
        if errors:
            logger.warning(f"Pipeline completed with errors: {errors}")

        logger.info(f"✅ Pipeline complete: {result.get('template_name', 'unnamed')}")
        return result


# Singleton
_template_gen: Optional[TemplateGenGraph] = None


def get_template_gen_graph() -> TemplateGenGraph:
    """Get or create the template generation graph singleton."""
    global _template_gen
    if _template_gen is None:
        _template_gen = TemplateGenGraph()
    return _template_gen
