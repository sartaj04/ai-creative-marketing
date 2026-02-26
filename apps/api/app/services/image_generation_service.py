"""AI image generation service using Nano Banana (Gemini native image gen)."""
import base64
import logging
from typing import Optional

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)


class ImageGenerationService:
    """Generates images using Nano Banana (Gemini 2.5 Flash Image).

    Uses the Gemini API's native image generation capabilities with
    style-aware prompt enrichment from the user's identity graph.
    """

    def __init__(self):
        self._client = None

    def _ensure_client(self):
        """Lazy-initialize the Google GenAI client using Vertex AI credentials."""
        if self._client is None:
            from google.oauth2 import service_account

            if settings.GCP_CLIENT_EMAIL and settings.GCP_PRIVATE_KEY:
                credentials = service_account.Credentials.from_service_account_info(
                    {
                        "type": "service_account",
                        "project_id": settings.GCP_PROJECT_ID,
                        "private_key": (settings.GCP_PRIVATE_KEY or "").replace("\\n", "\n"),
                        "client_email": settings.GCP_CLIENT_EMAIL,
                        "token_uri": "https://oauth2.googleapis.com/token",
                    },
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )
                self._client = genai.Client(
                    vertexai=True,
                    project=settings.GCP_PROJECT_ID,
                    location=settings.GCP_LOCATION,
                    credentials=credentials,
                )
            else:
                self._client = genai.Client(
                    vertexai=True,
                    project=settings.GCP_PROJECT_ID,
                    location=settings.GCP_LOCATION,
                )
            logger.info("Nano Banana (google-genai) client initialized")

    async def generate_image(
        self,
        prompt: str,
        style: str = "professional",
        brand_context: Optional[dict] = None,
        width: int = 1080,
        height: int = 1080,
        negative_prompt: Optional[str] = None,
    ) -> bytes:
        """Generate an image from a text prompt using Nano Banana.

        Args:
            prompt: Base prompt describing the desired image
            style: Visual style preset (professional, creative, minimal, bold, abstract)
            brand_context: Optional brand info for prompt enrichment
                {brand_tone, colors, industry, visual_preferences}
            width: Desired width (used to compute aspect ratio)
            height: Desired height
            negative_prompt: Things to avoid in the image

        Returns:
            PNG image as bytes
        """
        self._ensure_client()

        # Build the enriched prompt
        full_prompt = self._build_prompt(prompt, style, brand_context, negative_prompt)
        aspect_ratio = self._get_aspect_ratio(width, height)

        logger.info(f"Generating image via Nano Banana: style={style}, aspect={aspect_ratio}, prompt_len={len(full_prompt)}")

        try:
            response = self._client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[full_prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["Image"],
                    image_config=types.ImageConfig(
                        aspect_ratio=aspect_ratio,
                    ),
                ),
            )

            # Extract image from response parts
            for part in response.parts:
                if part.inline_data is not None:
                    image_bytes = part.inline_data.data
                    if isinstance(image_bytes, str):
                        image_bytes = base64.b64decode(image_bytes)
                    logger.info(f"Image generated successfully: {len(image_bytes)} bytes")
                    return image_bytes

            raise RuntimeError("Nano Banana returned no image in response")

        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            raise

    def _build_prompt(
        self,
        base_prompt: str,
        style: str,
        brand_context: Optional[dict] = None,
        negative_prompt: Optional[str] = None,
    ) -> str:
        """Build an enriched prompt with style and brand context."""

        # Style presets
        style_modifiers = {
            "professional": "clean, modern, corporate, polished, high-end",
            "creative": "artistic, vibrant, dynamic, eye-catching, innovative",
            "minimal": "minimalist, clean lines, white space, elegant, simple",
            "bold": "bold colors, strong contrast, impactful, dramatic, powerful",
            "abstract": "abstract, geometric, patterns, gradients, modern art",
        }

        modifier = style_modifiers.get(style, style_modifiers["professional"])
        parts = [base_prompt, modifier]

        # Enrich with brand context
        if brand_context:
            if brand_context.get("colors"):
                colors = ", ".join(brand_context["colors"][:3])
                parts.append(f"color palette: {colors}")
            if brand_context.get("industry"):
                parts.append(f"related to {brand_context['industry']} industry")
            if brand_context.get("visual_preferences"):
                parts.append(brand_context["visual_preferences"])

        parts.append("high resolution, 4k quality, social media ready")

        # Add negative guidance
        if negative_prompt:
            parts.append(f"avoid: {negative_prompt}")
        else:
            parts.append(
                "avoid: text, watermark, logo, blurry, low quality, distorted, "
                "ugly, deformed, noisy, oversaturated"
            )

        return ". ".join(parts)

    def _get_aspect_ratio(self, width: int, height: int) -> str:
        """Map dimensions to supported aspect ratios."""
        ratio = width / height
        if abs(ratio - 1.0) < 0.1:
            return "1:1"
        elif abs(ratio - 16 / 9) < 0.1:
            return "16:9"
        elif abs(ratio - 9 / 16) < 0.1:
            return "9:16"
        elif abs(ratio - 4 / 3) < 0.1:
            return "4:3"
        elif abs(ratio - 3 / 4) < 0.1:
            return "3:4"
        else:
            return "1:1"

    async def generate_image_prompt(
        self,
        slide_context: str,
        brand_tone: Optional[str] = None,
    ) -> str:
        """Use LLM to generate an image prompt from slide/post context."""
        self._ensure_client()

        system_prompt = """You are an expert at creating image generation prompts for professional social media content.
Given the text content of a post or carousel slide, create a concise, descriptive image prompt
that would result in a visually compelling illustration or background.

Rules:
- Focus on visual elements, composition, and mood
- Do NOT include any text/words in the image description
- Keep it under 100 words
- Make it suitable for professional LinkedIn/Twitter content
- Include style, lighting, and color guidance"""

        brand_note = f"\nBrand tone: {brand_tone}" if brand_tone else ""

        response = self._client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[f"{system_prompt}{brand_note}\n\nContent:\n{slide_context}\n\nImage prompt:"],
        )

        return response.text.strip()


# Singleton instance
_image_gen_service: Optional[ImageGenerationService] = None


def get_image_generation_service() -> ImageGenerationService:
    """Get or create the image generation service singleton."""
    global _image_gen_service
    if _image_gen_service is None:
        _image_gen_service = ImageGenerationService()
    return _image_gen_service
