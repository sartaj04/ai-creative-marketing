"""
Template Generator using LangChain with Vertex AI.

Simple, direct approach using Gemini Vision for image analysis
and code generation with strict variable naming.
"""
import base64
import json
import logging
import os
import re
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from app.config import settings
from app.utils.json_repair import repair_json

logger = logging.getLogger(__name__)

# Standard variable names that MUST be used
STANDARD_VARIABLES = {
    "text": ["headline", "subheadline", "cta_text", "description"],
    "images": ["logo_url", "product_image", "background_image"],
    "colors": ["primary_color", "secondary_color", "background_color", "text_color"],
    "commerce": ["discount", "price", "original_price", "offer_text"],
}

ALL_ALLOWED_VARIABLES = set(
    var for category in STANDARD_VARIABLES.values() for var in category
)

# Path for generated credentials file
CREDENTIALS_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "gcp-credentials.json"
)


@dataclass
class TemplateGenerationResult:
    """Result from template generation pipeline."""
    template_id: str
    html_code: str
    css_code: str
    suggested_name: str
    suggested_description: str
    suggested_industry: str
    suggested_platform: str
    suggested_objective: str
    suggested_aspect_ratios: List[str]
    detected_zones: List[Dict[str, Any]]
    detected_variables: List[Dict[str, Any]]
    layout_schema: Dict[str, Any]
    source_type: str
    source_url: Optional[str]
    analysis_notes: str
    confidence_score: float
    review_status: str
    review_issues: List[str]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "template_id": self.template_id,
            "html_code": self.html_code,
            "css_code": self.css_code,
            "suggested_name": self.suggested_name,
            "suggested_description": self.suggested_description,
            "suggested_industry": self.suggested_industry,
            "suggested_platform": self.suggested_platform,
            "suggested_objective": self.suggested_objective,
            "suggested_aspect_ratios": self.suggested_aspect_ratios,
            "detected_zones": self.detected_zones,
            "detected_variables": self.detected_variables,
            "layout_schema": self.layout_schema,
            "source_type": self.source_type,
            "source_url": self.source_url,
            "analysis_notes": self.analysis_notes,
            "confidence_score": self.confidence_score,
            "review_status": self.review_status,
            "review_issues": self.review_issues,
        }


def _setup_credentials():
    """Set up Vertex AI credentials from environment variables."""
    if os.path.exists(CREDENTIALS_FILE_PATH):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_FILE_PATH
        return

    if not all([settings.gcp_project_id, settings.gcp_client_email, settings.gcp_private_key]):
        raise ValueError(
            "GCP credentials not configured. Set GCP_PROJECT_ID, GCP_CLIENT_EMAIL, "
            "and GCP_PRIVATE_KEY in your .env file"
        )

    # Handle escaped newlines
    private_key = settings.gcp_private_key
    if '\\n' in private_key and '\n' not in private_key:
        private_key = private_key.replace('\\n', '\n')

    credentials_dict = {
        "type": "service_account",
        "project_id": settings.gcp_project_id,
        "private_key": private_key,
        "client_email": settings.gcp_client_email,
        "token_uri": "https://oauth2.googleapis.com/token",
    }

    with open(CREDENTIALS_FILE_PATH, 'w') as f:
        json.dump(credentials_dict, f, indent=2)

    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_FILE_PATH
    logger.info(f"Created credentials file: {CREDENTIALS_FILE_PATH}")


class TemplateGenerator:
    """
    Template generator using LangChain with Vertex AI Gemini.

    Performs 3-step pipeline:
    1. Analyze image to extract layout, colors, zones
    2. Generate HTML/CSS with strict variable naming
    3. Validate output for compliance
    """

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        _setup_credentials()

        # Initialize Google GenAI client with Vertex AI backend
        self.client = genai.Client(
            vertexai=True,
            project=settings.gcp_project_id,
            location=settings.gcp_location or "us-central1",
        )

        self.model_id = "gemini-2.0-flash-001"
        self.generation_config = types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=4096,
        )

        logger.info(f"Initialized TemplateGenerator with Vertex AI project: {settings.gcp_project_id}")

    def generate_template(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
        template_id: Optional[str] = None
    ) -> TemplateGenerationResult:
        """
        Generate a template from an uploaded image.

        Args:
            image_bytes: Raw image data
            mime_type: Image MIME type
            template_id: Optional template ID

        Returns:
            TemplateGenerationResult with generated template
        """
        if template_id is None:
            template_id = str(uuid.uuid4())

        logger.info(f"Starting template generation for {template_id}")

        try:
            # Step 1: Analyze image
            analysis = self._analyze_image(image_bytes, mime_type)
            logger.info(f"Analysis complete: {analysis.get('suggested_name', 'Unknown')}")

            # Step 2: Generate HTML/CSS
            generation = self._generate_code(analysis)
            logger.info(f"Code generation complete")

            # Step 3: Validate
            validation = self._validate_output(generation, analysis)
            logger.info(f"Validation: {validation.get('status', 'unknown')}")

            # Use corrected HTML if provided
            html_code = validation.get("corrected_html") or generation.get("html", "")
            css_code = generation.get("css", "")

            # Build result
            classification = analysis.get("classification", {})

            return TemplateGenerationResult(
                template_id=template_id,
                html_code=html_code,
                css_code=css_code,
                suggested_name=analysis.get("suggested_name", "AI Generated Template"),
                suggested_description=analysis.get("suggested_description", ""),
                suggested_industry=classification.get("industry", "general"),
                suggested_platform=classification.get("platform", "general"),
                suggested_objective=classification.get("objective", "general"),
                suggested_aspect_ratios=[classification.get("aspect_ratio", "1:1")],
                detected_zones=analysis.get("zones", []),
                detected_variables=self._build_variable_metadata(generation.get("variables_used", [])),
                layout_schema={"zones": analysis.get("zones", [])},
                source_type="image",
                source_url=None,
                analysis_notes=f"Generated via Vertex AI Gemini. Review: {validation.get('status', 'pending')}",
                confidence_score=0.95 if validation.get("status") == "approved" else 0.7,
                review_status=validation.get("status", "pending"),
                review_issues=validation.get("issues", []),
            )

        except Exception as e:
            logger.error(f"Template generation failed: {e}")
            return TemplateGenerationResult(
                template_id=template_id,
                html_code="",
                css_code="",
                suggested_name="Generation Failed",
                suggested_description=str(e),
                suggested_industry="general",
                suggested_platform="general",
                suggested_objective="general",
                suggested_aspect_ratios=["1:1"],
                detected_zones=[],
                detected_variables=[],
                layout_schema={},
                source_type="image",
                source_url=None,
                analysis_notes=f"Error: {str(e)}",
                confidence_score=0.0,
                review_status="failed",
                review_issues=[str(e)],
            )

    def _analyze_image(self, image_bytes: bytes, mime_type: str) -> Dict[str, Any]:
        """Analyze image to extract layout, colors, and metadata."""

        image_b64 = base64.b64encode(image_bytes).decode()

        prompt = """Analyze this ad template image thoroughly.

## Extract the following:

### 1. LAYOUT ZONES
Identify ALL visual zones. For each:
- zone_id: Unique identifier (e.g., "headline_zone")
- zone_type: One of [headline, subheadline, description, cta_button, logo, product_image, background_image, badge, price, discount]
- position: Relative position (top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right)
- size: Relative size (small, medium, large, full-width, full-height)
- content_description: What content this zone contains

### 2. COLOR PALETTE
Extract exact colors:
- primary_color: Main accent color (hex)
- secondary_color: Secondary color (hex)
- background_color: Background color (hex)
- text_color: Main text color (hex)

### 3. TYPOGRAPHY
- headline_style: bold/regular/light
- font_category: serif/sans-serif/display/script
- overall_feel: modern/classic/playful/elegant/bold

### 4. CLASSIFICATION
- industry: ecommerce | saas | healthcare | food | realestate | finance | personal | local | general
- platform: instagram | facebook | linkedin | twitter | meta_ads | google_ads | general
- objective: conversion | awareness | promotion | engagement | testimonial | announcement | general
- aspect_ratio: 1:1 | 9:16 | 16:9 | 4:5 | 1.91:1

### 5. METADATA
- suggested_name: Descriptive template name
- suggested_description: 1-2 sentence description

## Output ONLY valid JSON:
```json
{
    "zones": [...],
    "colors": {...},
    "typography": {...},
    "classification": {...},
    "suggested_name": "...",
    "suggested_description": "..."
}
```"""

        # Create image part
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        response = self.client.models.generate_content(
            model=self.model_id,
            contents=[prompt, image_part],
            config=self.generation_config,
        )
        return self._parse_json_response(response.text)

    def _generate_code(self, analysis: Dict[str, Any], image_bytes: bytes, mime_type: str) -> Dict[str, Any]:
        """Generate HTML/CSS based on analysis AND the original image."""

        analysis_json = json.dumps(analysis, indent=2)
        aspect_ratio = analysis.get("classification", {}).get("aspect_ratio", "1:1")

        prompt = f"""You are a senior frontend developer. Look at this ad template image and recreate it EXACTLY as HTML/CSS.

## Your Task
Recreate this exact design as a pixel-perfect HTML/CSS template. The template must look IDENTICAL to the image when rendered.

## Analysis (for reference):
{analysis_json}

## CRITICAL REQUIREMENTS

### 1. VISUAL ACCURACY (Most Important!)
- Recreate the EXACT layout you see in the image
- Match positions, sizes, spacing, fonts as closely as possible
- If there's a product image on the left, put the product_image variable there
- If there's a testimonial/quote, use the description variable
- If there's star ratings, include them in HTML
- Match the exact visual hierarchy

### 2. Variable Names (MUST use only these)
Text:
- {{{{ headline }}}} - For main headline text
- {{{{ subheadline }}}} - For secondary headline
- {{{{ cta_text }}}} - For button text
- {{{{ description }}}} - For body text, testimonials, quotes

Images:
- {{{{ logo_url }}}} - For brand logo
- {{{{ product_image }}}} - For product/hero image
- {{{{ background_image }}}} - For background image

Colors:
- {{{{ primary_color }}}} - Primary/accent color
- {{{{ secondary_color }}}} - Secondary color
- {{{{ background_color }}}} - Background color
- {{{{ text_color }}}} - Text color

Commerce:
- {{{{ discount }}}} - Discount percentage
- {{{{ price }}}} - Current price
- {{{{ original_price }}}} - Strikethrough price
- {{{{ offer_text }}}} - Promo text

### 3. HTML Structure
- Root: <div class="template-container">
- Use semantic elements
- Include ALL visual elements you see (stars, badges, decorative elements)

### 4. CSS Requirements
- Use CSS Grid or Flexbox for layout
- Define CSS custom properties for colors
- Make it responsive within container
- Aspect ratio: {aspect_ratio}
- Use appropriate fonts (sans-serif for modern, serif for elegant)

### 5. What to Include
- If you see star ratings: include them as ★ characters or SVG
- If you see decorative elements: recreate with CSS or include as visual elements
- If you see specific shapes: recreate with CSS
- Match font weights (bold headlines, regular body text)

## Output ONLY valid JSON:
```json
{{
    "html": "<div class='template-container'>...complete HTML...</div>",
    "css": ":root {{ --primary: {{{{ primary_color }}}}; ... }} .template-container {{ ... }}",
    "variables_used": ["headline", "cta_text", "primary_color", ...]
}}
```"""

        # Include the image so AI can see exactly what to recreate
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        response = self.client.models.generate_content(
            model=self.model_id,
            contents=[prompt, image_part],
            config=self.generation_config,
        )
        return self._parse_json_response(response.text)

    def _validate_output(self, generation: Dict[str, Any], analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Validate generated template for compliance."""

        html = generation.get("html", "")
        variables_used = generation.get("variables_used", [])

        issues = []

        # Check for forbidden variables
        found_vars = set(re.findall(r'\{\{\s*(\w+)\s*\}\}', html))
        forbidden = found_vars - ALL_ALLOWED_VARIABLES
        if forbidden:
            issues.append(f"Forbidden variables used: {', '.join(forbidden)}")

        # Check required variables
        required = {"headline", "cta_text", "primary_color", "background_color", "text_color"}
        missing = required - found_vars
        if missing:
            issues.append(f"Missing required variables: {', '.join(missing)}")

        # Check HTML structure
        if not html.strip().startswith("<div"):
            issues.append("HTML must start with a div element")

        if "template-container" not in html:
            issues.append("Missing 'template-container' class on root element")

        status = "approved" if not issues else "needs_review"

        return {
            "status": status,
            "issues": issues,
            "variables_found": list(found_vars),
            "corrected_html": None,  # Could implement auto-correction here
        }

    def _parse_json_response(self, content: str) -> Dict[str, Any]:
        """Parse JSON from LLM response, handling markdown code blocks."""

        # Try to extract from markdown code block
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            content = json_match.group(1)

        # Use repair_json for robustness
        result = repair_json(content)
        if result:
            return result

        # Fallback to direct parse
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON: {content[:200]}")
            return {}

    def _build_variable_metadata(self, variable_names: List[str]) -> List[Dict[str, Any]]:
        """Build metadata for detected variables."""

        variable_info = {
            # Text
            "headline": {"type": "text", "required": True, "max_length": 50},
            "subheadline": {"type": "text", "required": False, "max_length": 80},
            "cta_text": {"type": "text", "required": True, "max_length": 25},
            "description": {"type": "text", "required": False, "max_length": 200},
            # Images
            "logo_url": {"type": "image", "required": False},
            "product_image": {"type": "image", "required": False},
            "background_image": {"type": "image", "required": False},
            # Colors
            "primary_color": {"type": "color", "required": True},
            "secondary_color": {"type": "color", "required": False},
            "background_color": {"type": "color", "required": True},
            "text_color": {"type": "color", "required": True},
            # Commerce
            "discount": {"type": "text", "required": False, "max_length": 10},
            "price": {"type": "text", "required": False, "max_length": 15},
            "original_price": {"type": "text", "required": False, "max_length": 15},
            "offer_text": {"type": "text", "required": False, "max_length": 50},
        }

        metadata = []
        for name in variable_names:
            info = variable_info.get(name, {"type": "text", "required": False})
            metadata.append({
                "name": name,
                "type": info.get("type", "text"),
                "required": info.get("required", False),
                "max_length": info.get("max_length"),
            })

        return metadata
