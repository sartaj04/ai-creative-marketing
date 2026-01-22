"""
LangChain-based Template Generation Pipeline.

Uses Google Vertex AI (Gemini) for multi-step template generation:
1. Analyze uploaded image
2. Generate HTML/CSS with standard variables
3. Review and validate output
"""

from .template_generator import TemplateGenerator, TemplateGenerationResult

__all__ = ["TemplateGenerator", "TemplateGenerationResult"]
