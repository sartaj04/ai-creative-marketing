"""Template parser - extracts variables and metadata from templates."""
import re
from typing import Any


class TemplateParser:
    """Parser for extracting variables and structure from templates."""

    VARIABLE_PATTERN = re.compile(r"\{([^}]+)\}")

    @classmethod
    def extract_variables(cls, content: str) -> dict[str, dict[str, Any]]:
        """Extract all {variable} placeholders from template content.

        Args:
            content: Template content with {placeholders}

        Returns:
            Dictionary of variable metadata
        """
        matches = cls.VARIABLE_PATTERN.findall(content)

        variables = {}
        primary_keywords = ["topic", "subject", "main_topic", "title", "theme"]

        for i, var in enumerate(matches):
            var_name = var.strip()

            # Determine if primary
            is_primary = (
                i == 0 or
                any(kw in var_name.lower() for kw in primary_keywords)
            )

            # Detect variable type from name patterns
            var_type = cls._infer_variable_type(var_name)

            variables[var_name] = {
                "name": var_name,
                "is_primary": is_primary,
                "order": i,
                "type": var_type,
                "required": not var_name.startswith("optional_"),
            }

        return variables

    @classmethod
    def _infer_variable_type(cls, var_name: str) -> str:
        """Infer variable type from its name."""
        name_lower = var_name.lower()

        if any(x in name_lower for x in ["title", "topic", "subject", "theme"]):
            return "topic"
        if any(x in name_lower for x in ["description", "explain", "truth", "detail"]):
            return "description"
        if any(x in name_lower for x in ["example", "case", "story"]):
            return "example"
        if any(x in name_lower for x in ["number", "stat", "count", "percent"]):
            return "statistic"
        if any(x in name_lower for x in ["name", "author", "person"]):
            return "name"
        if any(x in name_lower for x in ["url", "link", "source"]):
            return "url"

        return "text"

    @classmethod
    def analyze_structure(cls, content: str) -> dict[str, Any]:
        """Analyze template structure to detect format patterns.

        Args:
            content: Template content

        Returns:
            Structure analysis
        """
        lines = content.strip().split("\n")

        analysis = {
            "line_count": len(lines),
            "has_numbered_list": False,
            "has_bullet_list": False,
            "has_sections": False,
            "estimated_format": "post",
        }

        numbered_pattern = re.compile(r"^\d+[\.\)]\s")
        bullet_pattern = re.compile(r"^[-•*]\s")
        section_pattern = re.compile(r"^#+\s|^[A-Z][^a-z]*:")

        for line in lines:
            if numbered_pattern.match(line):
                analysis["has_numbered_list"] = True
            if bullet_pattern.match(line):
                analysis["has_bullet_list"] = True
            if section_pattern.match(line):
                analysis["has_sections"] = True

        # Estimate format
        if len(lines) > 20 or analysis["has_sections"]:
            analysis["estimated_format"] = "article"
        elif len(lines) > 10 and (analysis["has_numbered_list"] or analysis["has_bullet_list"]):
            analysis["estimated_format"] = "thread"
        else:
            analysis["estimated_format"] = "post"

        return analysis

    @classmethod
    def validate_template(cls, content: str) -> tuple[bool, list[str]]:
        """Validate template content.

        Args:
            content: Template content

        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors = []

        if not content or not content.strip():
            errors.append("Template content cannot be empty")
            return False, errors

        variables = cls.extract_variables(content)

        if not variables:
            errors.append("Template must contain at least one {variable}")

        # Check for unclosed braces
        open_braces = content.count("{")
        close_braces = content.count("}")
        if open_braces != close_braces:
            errors.append(f"Mismatched braces: {open_braces} opening, {close_braces} closing")

        # Check for nested braces
        if re.search(r"\{[^}]*\{", content):
            errors.append("Nested braces are not allowed")

        return len(errors) == 0, errors
