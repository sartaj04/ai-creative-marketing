"""
Template AI Processor Service.

Provides AI-powered template processing capabilities:
- Image analysis using Gemini Vision
- HTML generation from images
- Metadata extraction and inference
- Feedback processing for iterative refinement
"""
import base64
import json
import re
import uuid
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

import requests
from google.oauth2 import service_account
import google.auth.transport.requests

from app.config import settings
from app.services.template_normalizer import normalize_template, extract_variables_from_text
from app.services.dummy_render import validate_template_integrity
from app.utils.json_repair import repair_json


class ContentType(str, Enum):
    """Type of content being processed."""
    IMAGE = "image"
    HTML = "html"


@dataclass
class MetadataInference:
    """Inferred metadata from template analysis."""
    suggested_name: str
    suggested_description: str
    suggested_industry: str
    suggested_platform: str
    suggested_objective: str
    suggested_aspect_ratios: List[str]
    confidence_score: float
    reasoning: str


@dataclass
class TemplateAIResult:
    """Result of AI template processing."""
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


class TemplateAIProcessor:
    """
    AI-powered template processor using Gemini Vision.
    
    Handles:
    - Image → HTML conversion
    - HTML analysis and enhancement
    - Metadata inference
    - Feedback-based refinement
    """
    
    def __init__(self):
        """Initialize with GCP credentials."""
        if not all([settings.gcp_project_id, settings.gcp_client_email, settings.gcp_private_key]):
            raise ValueError("Missing GCP credentials for AI processing")
        
        # Build credentials from env vars
        private_key = settings.gcp_private_key
        if '\\n' in private_key:
            private_key = private_key.replace('\\n', '\n')
        
        credentials_info = {
            "type": "service_account",
            "project_id": settings.gcp_project_id,
            "private_key": private_key,
            "client_email": settings.gcp_client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        
        self.credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        self.project_id = settings.gcp_project_id
        self.location = settings.gcp_location or "us-central1"
        self.model = "gemini-2.5-flash"
    
    def _refresh_credentials(self):
        """Refresh credentials if needed."""
        if not self.credentials.valid:
            self.credentials.refresh(google.auth.transport.requests.Request())
    
    def _call_gemini(
        self, 
        prompt: str, 
        image_data: Optional[bytes] = None,
        image_mime_type: str = "image/png",
        temperature: float = 0.4
    ) -> str:
        """
        Call Gemini API with text and optional image.
        
        Args:
            prompt: Text prompt
            image_data: Optional image bytes for vision requests
            image_mime_type: MIME type of image
            temperature: Sampling temperature
            
        Returns:
            Generated text response
        """
        self._refresh_credentials()
        
        url = f"https://{self.location}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{self.location}/publishers/google/models/{self.model}:generateContent"
        
        headers = {
            "Authorization": f"Bearer {self.credentials.token}",
            "Content-Type": "application/json",
        }
        
        # Build content parts
        parts = []
        
        # Add image if provided
        if image_data:
            image_b64 = base64.b64encode(image_data).decode('utf-8')
            parts.append({
                "inline_data": {
                    "mime_type": image_mime_type,
                    "data": image_b64
                }
            })
        
        # Add text prompt
        parts.append({"text": prompt})
        
        payload = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": 8192,
            }
        }
        
        import logging
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
            
            result = response.json()
            return result["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logging.error(f"Gemini API Error: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logging.error(f"Response content: {e.response.text}")
            raise e
            
    async def _generate_with_retry(
        self,
        prompt: str,
        image_data: Optional[bytes] = None,
        image_mime_type: str = "image/png",
        max_retries: int = 3,
        validation_mode: str = "html"  # 'html' or 'json'
    ) -> Dict[str, Any]:
        """
        Generate content with automatic retry and validation.
        """
        current_prompt = prompt
        last_error = None
        
        for attempt in range(max_retries):
            try:
                logging.info(f"AI Generation Attempt {attempt + 1}/{max_retries}")
                
                # Call AI
                text_response = self._call_gemini(
                    current_prompt, 
                    # Only include image for first attempt to avoid payload issues on retries if feedback prompt gets long
                    # But for now let's include it if present as it's critical context
                    image_data=image_data, 
                    image_mime_type=image_mime_type,
                    temperature=0.4 + (attempt * 0.1)
                )
                
                # Parse JSON
                parsed_json = repair_json(text_response)
                if not parsed_json:
                    raise ValueError("Failed to parse JSON response")
                
                # Validate Logic
                if validation_mode == "html":
                    html_code = parsed_json.get("html", "")
                    css_code = parsed_json.get("css", "")
                    
                    if not html_code or not html_code.strip():
                        raise ValueError("Generated HTML is empty")
                        
                    # logic check
                    validation = await validate_template_integrity(html_code, css_code, [])
                    if not validation["valid"]:
                        issues = "; ".join([i["message"] for i in validation["issues"]])
                        raise ValueError(f"HTML Validation Failed: {issues}")
                        
                return parsed_json
                
            except Exception as e:
                logging.warning(f"Generation failed attempt {attempt + 1}: {str(e)}")
                last_error = str(e)
                # Appending feedback to prompt for next retry
                current_prompt = f"{prompt}\n\nPREVIOUS ATTEMPT FAILED. ERROR: {last_error}\n\nPlease fix the error based on the feedback above and regenerate the JSON."
                
        raise ValueError(f"AI Generation failed after {max_retries} attempts. Last error: {last_error}")
    
    async def process_uploaded_image(
        self, 
        image_bytes: bytes, 
        filename: str,
        mime_type: str = "image/png"
    ) -> TemplateAIResult:
        """
        Process an uploaded image to generate template HTML/CSS.
        
        Args:
            image_bytes: Raw image data
            filename: Original filename
            mime_type: Image MIME type
            
        Returns:
            TemplateAIResult with generated HTML, metadata, etc.
        """
        template_id = str(uuid.uuid4())
        
        # Step 1: Analyze structure (Analysis step is usually safer, less complex output)
        analysis_prompt = """Analyze this ad template image and provide a detailed breakdown:

1. **Layout Structure**: Identify all visual zones (headline, subheadline, product image, logo, CTA button, background, badges, etc.)
   - For each zone, describe its position (top/middle/bottom, left/center/right), approximate size, and content type
   
2. **Visual Style**: 
   - Primary colors (hex codes if possible)
   - Font styles (bold, regular, decorative)
   - Overall aesthetic (modern, minimal, bold, elegant, playful)
   
3. **Template Classification**:
   - Industry: ecommerce, saas, healthcare, food, realestate, personal, finance, local, general
   - Platform: instagram, facebook, linkedin, twitter, meta_ads, google_ads, general
   - Objective: conversion, awareness, testimonial, promotion, engagement, announcement, general
   - Aspect ratio: 1:1, 9:16, 16:9, 4:5, 1.91:1

4. **Suggested Name**: A short, descriptive name for this template

Respond in JSON format:
```json
{
    "zones": [
        {"id": "zone_id", "type": "headline|image|cta|logo|badge|background|text", "position": "top-center", "size": "large|medium|small", "content_description": "..."}
    ],
    "colors": {"primary": "#hex", "secondary": "#hex", "background": "#hex", "text": "#hex"},
    "style": {"aesthetic": "...", "fonts": "..."},
    "classification": {"industry": "...", "platform": "...", "objective": "...", "aspect_ratio": "..."},
    "suggested_name": "...",
    "description": "..."
}
```"""
        
        # Use simple call for analysis (less prone to breaking) WITH REPAIR
        try:
            analysis_response = self._call_gemini(analysis_prompt, image_data=image_bytes, image_mime_type=mime_type, temperature=0.3)
            analysis = repair_json(analysis_response) or {}
        except Exception:
            analysis = {}
        
        # Step 2: Generate HTML/CSS with Retry Loop
        html_prompt = f"""Based on the attached ad template image and analysis:
{json.dumps(analysis, indent=2)}

Generate production-ready HTML and CSS code that recreates this template.

Requirements:
1. Use Jinja2 template variables for dynamic content: {{{{ headline }}}}, {{{{ subheadline }}}}, {{{{ cta_text }}}}, {{{{ product_image }}}}, {{{{ logo_url }}}}, {{{{ primary_color }}}}, {{{{ background_color }}}}, etc.
2. Make the template responsive within its container
3. Use CSS Grid or Flexbox for layout
4. Include all visual elements from the original
5. Use CSS variables for colors so they're easy to customize
6. The container should be exactly the size needed for the detected aspect ratio

Respond in this exact JSON format:
```json
{{
    "html": "<div class='template-container'>...</div>",
    "css": ".template-container {{ ... }}",
    "variables": [
        {{"name": "headline", "type": "text", "required": true, "default_value": "Sample Headline", "max_length": 50}},
        {{"name": "product_image", "type": "image", "required": true, "default_value": ""}},
        ...
    ]
}}
```"""

        # Execute robust generation
        generated = await self._generate_with_retry(
            html_prompt, 
            image_data=image_bytes, 
            image_mime_type=mime_type, 
            max_retries=3, 
            validation_mode="html"
        )
        
        # Step 3: Run normalization
        html_code = generated.get("html", "")
        css_code = generated.get("css", "")
        
        normalization = await normalize_template(html_code, css_code)
        
        # Merge detected variables
        ai_variables = generated.get("variables", [])
        norm_variables = normalization.get("suggested_variables", [])
        
        # Deduplicate
        seen_vars = set()
        merged_variables = []
        for var in ai_variables + norm_variables:
            if var.get("name") not in seen_vars:
                seen_vars.add(var.get("name"))
                merged_variables.append(var)
        
        classification = analysis.get("classification", {})
        
        return TemplateAIResult(
            template_id=template_id,
            html_code=html_code,
            css_code=css_code,
            suggested_name=analysis.get("suggested_name", filename.rsplit(".", 1)[0]),
            suggested_description=analysis.get("description", "AI-generated template"),
            suggested_industry=classification.get("industry", "general"),
            suggested_platform=classification.get("platform", "general"),
            suggested_objective=classification.get("objective", "general"),
            suggested_aspect_ratios=[classification.get("aspect_ratio", "1:1")],
            detected_zones=analysis.get("zones", []),
            detected_variables=merged_variables,
            layout_schema=normalization.get("layout_schema", {}),
            source_type=ContentType.IMAGE.value,
            source_url=None,
            analysis_notes=f"Generated via robust pipeline. Zones: {len(analysis.get('zones', []))}.",
            confidence_score=0.9
        )
    
    async def process_uploaded_html(
        self, 
        html_content: str, 
        css_content: str = ""
    ) -> TemplateAIResult:
        """
        Process uploaded HTML template to extract metadata and enhance.
        
        Args:
            html_content: HTML code
            css_content: CSS code
            
        Returns:
            TemplateAIResult with extracted metadata
        """
        template_id = str(uuid.uuid4())
        
        # Combine for analysis
        full_code = f"HTML:\n{html_content}\n\nCSS:\n{css_content}"
        
        # Analyze HTML/CSS
        analysis_prompt = f"""Analyze this HTML/CSS ad template and provide metadata:

{full_code}

Determine:
1. **Template Name**: A descriptive name based on the design
2. **Description**: What this template is for
3. **Classification**:
   - Industry: ecommerce, saas, healthcare, food, realestate, personal, finance, local, general
   - Platform: instagram, facebook, linkedin, twitter, meta_ads, google_ads, general
   - Objective: conversion, awareness, testimonial, promotion, engagement, announcement, general
   - Suitable aspect ratios: 1:1, 9:16, 16:9, 4:5, 1.91:1

4. **Zones**: Identify layout zones from the HTML structure
5. **Variables**: List any template variables (Jinja2 syntax like {{{{ var_name }}}})

Respond in JSON:
```json
{{
    "suggested_name": "...",
    "description": "...",
    "classification": {{"industry": "...", "platform": "...", "objective": "...", "aspect_ratios": [...]}},
    "zones": [{{"id": "...", "type": "...", "description": "..."}}],
    "analysis_notes": "..."
}}
```"""

        try:
            analysis_response = self._call_gemini(analysis_prompt, temperature=0.3)
            analysis = repair_json(analysis_response) or {}
        except Exception:
            analysis = {}
        
        # Run normalization for variable detection
        normalization = await normalize_template(html_content, css_content)
        
        classification = analysis.get("classification", {})
        
        return TemplateAIResult(
            template_id=template_id,
            html_code=html_content,
            css_code=css_content,
            suggested_name=analysis.get("suggested_name", "Uploaded Template"),
            suggested_description=analysis.get("description", ""),
            suggested_industry=classification.get("industry", "general"),
            suggested_platform=classification.get("platform", "general"),
            suggested_objective=classification.get("objective", "general"),
            suggested_aspect_ratios=classification.get("aspect_ratios", ["1:1"]),
            detected_zones=analysis.get("zones", normalization.get("zones", [])),
            detected_variables=normalization.get("suggested_variables", []),
            layout_schema=normalization.get("layout_schema", {}),
            source_type=ContentType.HTML.value,
            source_url=None,
            analysis_notes=analysis.get("analysis_notes", "Analyzed from uploaded HTML"),
            confidence_score=0.9
        )
    
    async def apply_feedback(
        self, 
        current_html: str,
        current_css: str,
        current_metadata: Dict[str, Any],
        feedback: str,
        original_image_bytes: Optional[bytes] = None,
        original_image_mime: str = "image/png"
    ) -> TemplateAIResult:
        """
        Apply natural language feedback to refine the template.
        
        Args:
            current_html: Current HTML code
            current_css: Current CSS code
            current_metadata: Current metadata (name, industry, etc.)
            feedback: Natural language feedback from user
            original_image_bytes: Original uploaded image (if available)
            original_image_mime: MIME type of original image
            
        Returns:
            Updated TemplateAIResult
        """
        feedback_prompt = f"""I have this HTML/CSS ad template:

**Current HTML:**
```html
{current_html}
```

**Current CSS:**
```css
{current_css}
```

**Current Metadata:**
{json.dumps(current_metadata, indent=2)}

**User Feedback:**
"{feedback}"

Based on the feedback, update the template. Respond in JSON:
```json
{{
    "html": "updated HTML code",
    "css": "updated CSS code",
    "metadata_changes": {{
        "industry": "new value if changed, else null",
        "platform": "new value if changed, else null",
        "objective": "new value if changed, else null",
        "name": "new value if changed, else null",
        "description": "new value if changed, else null"
    }},
    "changes_made": "Description of what was changed",
    "variables": [updated list of variables if changed]
}}
```

Only include actual changes. Keep the template structure intact unless the feedback specifically asks for structural changes."""

        # Retry loop for feedback too
        generated = await self._generate_with_retry(
            feedback_prompt, 
            image_data=original_image_bytes, 
            image_mime_type=original_image_mime,
            max_retries=3,
            validation_mode="html"
        )
        
        # Merge logic (similar to before but using robust result)
        new_metadata = current_metadata.copy()
        if "metadata_changes" in generated:
            for key, value in generated["metadata_changes"].items():
                if value is not None:
                    new_metadata[key] = value
        
        # Run normalization on updated code
        new_html = generated.get("html", current_html)
        new_css = generated.get("css", current_css)
        normalization = await normalize_template(new_html, new_css)
        
        # Use provided variables or fall back to normalization
        variables = generated.get("variables") or normalization.get("suggested_variables", [])
        
        return TemplateAIResult(
            template_id=current_metadata.get("template_id", str(uuid.uuid4())),
            html_code=new_html,
            css_code=new_css,
            suggested_name=new_metadata.get("name", "Template"),
            suggested_description=new_metadata.get("description", ""),
            suggested_industry=new_metadata.get("industry", "general"),
            suggested_platform=new_metadata.get("platform", "general"),
            suggested_objective=new_metadata.get("objective", "general"),
            suggested_aspect_ratios=new_metadata.get("aspect_ratios", ["1:1"]),
            detected_zones=normalization.get("zones", []),
            detected_variables=variables,
            layout_schema=normalization.get("layout_schema", {}),
            source_type=current_metadata.get("source_type", ContentType.HTML.value),
            source_url=current_metadata.get("source_url"),
            analysis_notes=generated.get("changes_made", "Applied feedback"),
            confidence_score=0.9
        )
    
    def _parse_json_response(self, response: str) -> Dict[str, Any]:
        """Legacy wrapper for backward compatibility if needed, using new repair."""
        return repair_json(response) or {}


# Singleton instance
_processor: Optional[TemplateAIProcessor] = None


def get_template_ai_processor() -> TemplateAIProcessor:
    """Get or create the template AI processor instance."""
    global _processor
    if _processor is None:
        _processor = TemplateAIProcessor()
    return _processor
