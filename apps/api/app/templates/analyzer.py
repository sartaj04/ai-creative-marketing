"""Template analyzer service for auto-extracting metadata using LLM."""
import json
import re
from typing import Any

from app.llm.provider import get_llm_provider


def extract_variables(content: str) -> dict[str, dict[str, Any]]:
    """Extract {variable} placeholders from template content."""
    pattern = r"\{([^}]+)\}"
    matches = re.findall(pattern, content)

    variables = {}
    seen = set()
    order = 0

    for var in matches:
        var_name = var.strip()
        if var_name in seen:
            continue
        seen.add(var_name)

        # Determine if primary based on common naming patterns
        is_primary = order == 0 or var_name.lower() in [
            "topic",
            "subject",
            "main_topic",
            "title",
            "headline",
        ]

        # Infer type from variable name
        var_type = "text"
        if any(kw in var_name.lower() for kw in ["list", "items", "points"]):
            var_type = "list"
        elif any(kw in var_name.lower() for kw in ["number", "count", "amount"]):
            var_type = "number"
        elif any(kw in var_name.lower() for kw in ["url", "link"]):
            var_type = "url"

        variables[var_name] = {
            "name": var_name,
            "is_primary": is_primary,
            "order": order,
            "type": var_type,
            "required": order < 3,  # First 3 variables are typically required
        }
        order += 1

    return variables


async def analyze_template_with_llm(
    content: str,
    name: str | None = None,
    description: str | None = None,
) -> dict[str, Any]:
    """
    Use Gemini to analyze a template and extract metadata.

    Returns:
        dict with keys: category, tags, use_cases, tone_fit, suggested_name, suggested_description
    """
    llm = get_llm_provider("gemini")

    prompt = f"""Analyze this content template and extract metadata.

Template Name: {name or 'Not provided'}
Template Description: {description or 'Not provided'}

Template Content:
---
{content}
---

Analyze the template and provide the following in JSON format:

1. "category": The best category for this template. Must be ONE of:
   - "myth_buster" (debunking misconceptions)
   - "tips" (numbered tips/advice)
   - "story" (personal narrative)
   - "framework" (step-by-step methodology)
   - "contrarian" (hot takes, unpopular opinions)
   - "lessons" (lessons learned format)
   - "listicle" (generic list format)
   - "question" (engaging question hooks)
   - "comparison" (X vs Y format)
   - "announcement" (news, updates)
   - "case_study" (detailed examples)

2. "tags": Array of 3-6 relevant topic tags (lowercase, e.g., ["leadership", "productivity", "career"])

3. "use_cases": Array of 2-4 specific scenarios when to use this template (e.g., ["debunking industry misconceptions", "educational content about best practices"])

4. "tone_fit": Array of 2-4 tones this template works well with. Choose from:
   ["professional", "casual", "authoritative", "educational", "inspirational", "conversational", "provocative", "empathetic", "humorous", "technical"]

5. "suggested_name": A concise, descriptive name for this template (if current name is generic or missing)

6. "suggested_description": A 1-2 sentence description of what this template is for and when to use it

7. "format": The best format for this template. Must be ONE of:
   - "post" (single post)
   - "thread" (multi-part thread)
   - "carousel" (slide-based)
   - "article" (long-form)

8. "platform": Best platform for this template. ONE of: "linkedin", "twitter", "both"

Respond with ONLY valid JSON, no other text."""

    try:
        response = await llm.generate(
            prompt=prompt,
            system_prompt="You are a content strategy expert. Analyze templates and extract accurate metadata. Respond with valid JSON only.",
            temperature=0.3,
            max_tokens=1000,
        )

        # Parse JSON from response
        json_match = re.search(r"\{[\s\S]*\}", response)
        if json_match:
            result = json.loads(json_match.group())
            return result
        else:
            raise ValueError("No JSON found in response")

    except Exception as e:
        # Return sensible defaults if LLM fails
        return {
            "category": "tips",
            "tags": [],
            "use_cases": [],
            "tone_fit": ["professional"],
            "suggested_name": name,
            "suggested_description": description,
            "format": "post",
            "platform": "linkedin",
            "error": str(e),
        }


async def analyze_and_enrich_template(
    content: str,
    name: str | None = None,
    description: str | None = None,
    user_provided_category: str | None = None,
    user_provided_tags: list[str] | None = None,
    user_provided_use_cases: list[str] | None = None,
    user_provided_tone_fit: list[str] | None = None,
    user_provided_format: str | None = None,
    user_provided_platform: str | None = None,
) -> dict[str, Any]:
    """
    Analyze template and merge LLM suggestions with user-provided values.
    User-provided values take precedence.

    Returns:
        Complete template metadata dict ready for database insertion
    """
    # Extract variables
    variables = extract_variables(content)

    # Get LLM analysis
    llm_analysis = await analyze_template_with_llm(content, name, description)

    # Merge with user-provided values (user values take precedence)
    result = {
        "variables": variables,
        "category": user_provided_category or llm_analysis.get("category", "tips"),
        "tags": user_provided_tags if user_provided_tags else llm_analysis.get("tags", []),
        "use_cases": user_provided_use_cases if user_provided_use_cases else llm_analysis.get("use_cases", []),
        "tone_fit": user_provided_tone_fit if user_provided_tone_fit else llm_analysis.get("tone_fit", ["professional"]),
        "format": user_provided_format or llm_analysis.get("format", "post"),
        "platform": user_provided_platform or llm_analysis.get("platform", "linkedin"),
        "suggested_name": llm_analysis.get("suggested_name"),
        "suggested_description": llm_analysis.get("suggested_description"),
    }

    return result
