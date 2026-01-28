"""Stub LLM provider for testing."""
import json
from typing import Any, Optional

from app.llm.base import LLMProvider


class StubProvider(LLMProvider):
    """Stub LLM provider for testing without API calls."""

    @property
    def name(self) -> str:
        return "stub"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Return stub response."""
        return f"[STUB RESPONSE] Prompt received: {prompt[:100]}..."

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
    ) -> dict[str, Any]:
        """Return stub JSON response."""
        return {
            "stub": True,
            "message": "This is a stub response for testing",
            "themes": ["AI", "Technology", "Innovation"],
            "expertise_keywords": ["Machine Learning", "Data Science"],
            "tone_markers": {"professional": 0.7, "casual": 0.3},
        }

    async def embed(self, text: str) -> list[float]:
        """Return stub embedding."""
        # Return a simple deterministic embedding based on text length
        import hashlib

        text_hash = hashlib.md5(text.encode()).hexdigest()
        # Convert hash to floats
        embedding = []
        for i in range(0, len(text_hash), 2):
            val = int(text_hash[i : i + 2], 16) / 255.0 - 0.5
            embedding.append(val)

        # Pad to 768 dimensions (Gemini's embedding size)
        while len(embedding) < 768:
            embedding.extend(embedding[: 768 - len(embedding)])

        return embedding[:768]
