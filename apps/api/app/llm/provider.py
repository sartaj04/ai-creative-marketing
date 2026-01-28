"""LLM provider factory."""
from functools import lru_cache
from typing import Literal

from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.bedrock import BedrockProvider
from app.llm.gemini import GeminiProvider
from app.llm.stub import StubProvider

ProviderType = Literal["gemini", "bedrock", "stub"]


@lru_cache()
def get_llm_provider(
    provider_type: ProviderType | None = None,
    use_complex: bool = False,
) -> LLMProvider:
    """Get LLM provider instance.

    Args:
        provider_type: Specific provider to use (overrides settings)
        use_complex: If True, use the complex provider (Claude) for intensive tasks

    Returns:
        LLM provider instance
    """
    if provider_type:
        provider = provider_type
    elif use_complex:
        provider = settings.LLM_COMPLEX_PROVIDER
    else:
        provider = settings.LLM_PRIMARY_PROVIDER

    if provider == "gemini":
        return GeminiProvider()
    elif provider == "bedrock":
        return BedrockProvider()
    elif provider == "stub":
        return StubProvider()
    else:
        # Default to Gemini for cost efficiency
        return GeminiProvider()


# Convenience functions
def get_primary_provider() -> LLMProvider:
    """Get primary LLM provider (Gemini - cost efficient)."""
    return get_llm_provider(use_complex=False)


def get_complex_provider() -> LLMProvider:
    """Get complex LLM provider (Claude - for style analysis)."""
    return get_llm_provider(use_complex=True)
