"""Abstract LLM provider interface."""
from abc import ABC, abstractmethod
from typing import Any, Optional


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Generate text from prompt.

        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt for context
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate

        Returns:
            Generated text response
        """
        pass

    @abstractmethod
    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
    ) -> dict[str, Any]:
        """Generate structured JSON response.

        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            temperature: Sampling temperature

        Returns:
            Parsed JSON response
        """
        pass

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Generate embedding vector for text.

        Args:
            text: Text to embed

        Returns:
            Embedding vector (list of floats)
        """
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name."""
        pass
