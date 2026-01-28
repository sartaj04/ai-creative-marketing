"""Template renderer - fills templates with generated content."""
import re
from typing import Any, Optional

from app.llm.base import LLMProvider


class TemplateRenderer:
    """Renderer for filling templates with content."""

    VARIABLE_PATTERN = re.compile(r"\{([^}]+)\}")

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        """Initialize renderer with optional LLM provider.

        Args:
            llm_provider: LLM provider for generating fill content
        """
        self.llm = llm_provider

    def render(self, template_content: str, variables: dict[str, str]) -> str:
        """Render template with provided variables.

        Args:
            template_content: Template with {placeholders}
            variables: Dictionary mapping variable names to values

        Returns:
            Rendered content with placeholders filled
        """
        result = template_content

        for var_name, value in variables.items():
            pattern = f"{{{var_name}}}"
            result = result.replace(pattern, str(value))

        return result

    def get_unfilled_variables(self, template_content: str, variables: dict[str, str]) -> list[str]:
        """Get list of variables not provided in the variables dict.

        Args:
            template_content: Template content
            variables: Provided variables

        Returns:
            List of variable names still needing values
        """
        all_vars = self.VARIABLE_PATTERN.findall(template_content)
        provided = set(variables.keys())
        return [v for v in all_vars if v not in provided]

    async def render_with_llm(
        self,
        template_content: str,
        context: dict[str, Any],
        identity: Optional[dict[str, Any]] = None,
        style: Optional[dict[str, Any]] = None,
    ) -> str:
        """Render template using LLM to generate variable values.

        Args:
            template_content: Template with {placeholders}
            context: Context for generation (topic, angle, etc.)
            identity: User's identity graph
            style: User's style profile

        Returns:
            Fully rendered content
        """
        if not self.llm:
            raise ValueError("LLM provider required for render_with_llm")

        # Extract variables
        variables = self.VARIABLE_PATTERN.findall(template_content)

        if not variables:
            return template_content

        # Build prompt for LLM
        prompt = f"""Fill in the following template variables for a LinkedIn post.

Template:
{template_content}

Context:
- Topic: {context.get('topic', 'general')}
- Angle: {context.get('angle', 'professional perspective')}

User Identity:
- Themes: {identity.get('themes', []) if identity else []}
- Expertise: {identity.get('expertise_keywords', []) if identity else []}

Style:
- Tone: {style.get('tone_sliders', {}) if style else {}}

Generate values for these variables: {', '.join(variables)}

Respond in JSON format with variable names as keys and their values as strings:
{{
    "{variables[0]}": "value for first variable",
    ...
}}
"""

        result = await self.llm.generate_json(prompt=prompt)

        # Render with generated values
        return self.render(template_content, result)

    def preview(self, template_content: str) -> str:
        """Generate a preview with placeholder indicators.

        Args:
            template_content: Template content

        Returns:
            Preview with highlighted placeholders
        """
        def highlight(match):
            var_name = match.group(1)
            return f"[{var_name}]"

        return self.VARIABLE_PATTERN.sub(highlight, template_content)
