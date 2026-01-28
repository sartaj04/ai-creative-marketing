"""Google Gemini LLM provider."""
import json
from typing import Any, Optional

import google.generativeai as genai

from app.core.config import settings
from app.llm.base import LLMProvider


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider."""

    def __init__(self):
        """Initialize Gemini provider."""
        # Configure with API key from service account
        genai.configure(api_key=self._get_api_key())
        self._model = genai.GenerativeModel("gemini-1.5-flash")
        self._embedding_model = "models/text-embedding-004"

    def _get_api_key(self) -> str:
        """Get API key for Gemini."""
        # For Vertex AI, we'd use service account
        # For simplicity, using direct API key if available
        # In production, this should use proper Vertex AI authentication
        import os
        return os.getenv("GOOGLE_API_KEY", "")

    @property
    def name(self) -> str:
        return "gemini"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Generate text using Gemini."""
        try:
            # Combine system prompt and user prompt
            full_prompt = prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n{prompt}"

            # Configure generation
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )

            response = self._model.generate_content(
                full_prompt,
                generation_config=generation_config,
            )

            return response.text

        except Exception as e:
            print(f"Gemini generation error: {e}")
            raise

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
    ) -> dict[str, Any]:
        """Generate structured JSON response."""
        json_prompt = f"""
{prompt}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.
"""
        if system_prompt:
            json_prompt = f"{system_prompt}\n\n{json_prompt}"

        response = await self.generate(
            prompt=json_prompt,
            temperature=temperature,
            max_tokens=2000,
        )

        # Clean response and parse JSON
        cleaned = response.strip()
        if cleaned.startswith("```"):
            # Remove markdown code blocks
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            print(f"Response was: {cleaned}")
            return {}

    async def embed(self, text: str) -> list[float]:
        """Generate embedding using Gemini."""
        try:
            result = genai.embed_content(
                model=self._embedding_model,
                content=text,
                task_type="retrieval_document",
            )
            return result["embedding"]
        except Exception as e:
            print(f"Gemini embedding error: {e}")
            # Return zero vector as fallback
            return [0.0] * 768
