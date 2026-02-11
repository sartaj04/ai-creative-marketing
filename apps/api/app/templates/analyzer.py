"""Template analyzer service for auto-extracting metadata using LLM."""
import json
import logging
import re
from difflib import get_close_matches
from typing import Any

from app.llm.provider import get_llm_provider
from app.templates.constants import ALLOWED_USE_CASES, ALLOWED_TAGS, ALLOWED_TONES

logger = logging.getLogger(__name__)


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


def normalize_to_predefined_list(
    value: str, allowed_list: list[str], threshold: float = 0.6
) -> str | None:
    """
    Normalize a value to the closest match in the predefined list.
    
    Args:
        value: The value to normalize
        allowed_list: List of allowed values
        threshold: Minimum similarity ratio (0-1) to consider a match
        
    Returns:
        The closest match from allowed_list, or None if no close match found
    """
    value_lower = value.lower().strip()
    
    # Exact match (case-insensitive)
    for allowed in allowed_list:
        if allowed.lower() == value_lower:
            return allowed
    
    # Fuzzy match
    matches = get_close_matches(value_lower, [a.lower() for a in allowed_list], n=1, cutoff=threshold)
    if matches:
        # Find the original casing
        match_lower = matches[0]
        for allowed in allowed_list:
            if allowed.lower() == match_lower:
                return allowed
    
    return None


def normalize_list_to_predefined(
    values: list[str], allowed_list: list[str], threshold: float = 0.6
) -> list[str]:
    """
    Normalize a list of values to match predefined list.
    
    Args:
        values: List of values to normalize
        allowed_list: List of allowed values
        threshold: Minimum similarity ratio (0-1) to consider a match
        
    Returns:
        List of normalized values (only includes values that match predefined list)
    """
    normalized = []
    for value in values:
        normalized_value = normalize_to_predefined_list(value, allowed_list, threshold)
        if normalized_value and normalized_value not in normalized:
            normalized.append(normalized_value)
    return normalized


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
   - "common_mistakes" (pitfalls to avoid)

2. "tags": Array of 3-6 relevant topic tags. MUST choose from this exact list (use lowercase):
   {', '.join(sorted(ALLOWED_TAGS))}
   
3. "use_cases": Array of 2-4 specific scenarios when to use this template. MUST choose from this exact list:
   {chr(10).join(f'   - "{uc}"' for uc in ALLOWED_USE_CASES)}
   
4. "tone_fit": Array of 2-4 tones this template works well with. MUST choose from this exact list:
   {', '.join(ALLOWED_TONES)}

5. "suggested_name": A concise, descriptive name for this template (if current name is generic or missing)

6. "suggested_description": A 1-2 sentence description of what this template is for and when to use it

IMPORTANT: Only extract the fields listed above. Do NOT include format or platform fields.

Respond with ONLY valid JSON, no other text."""

    try:
        logger.info(f"Analyzing template: name={name}, content_length={len(content)}")
        
        # Use generate_json for more reliable JSON parsing
        result = await llm.generate_json(
            prompt=prompt,
            system_prompt="You are a content strategy expert. Analyze templates and extract accurate metadata. Respond with valid JSON only.",
            temperature=0.3,
        )
        
        logger.info(f"LLM returned result with keys: {list(result.keys()) if isinstance(result, dict) else 'not a dict'}")
        
        # Ensure result is a dict
        if not isinstance(result, dict):
            raise ValueError(f"Expected dict, got {type(result)}")
        
        # Log what we got before normalization
        logger.debug(f"Raw LLM result: {json.dumps(result, indent=2)}")
        
        # Normalize AI output to predefined lists
        if "tags" in result and isinstance(result["tags"], list):
            original_tags = result["tags"].copy()
            result["tags"] = normalize_list_to_predefined(result["tags"], ALLOWED_TAGS)
            if len(result["tags"]) == 0 and len(original_tags) > 0:
                logger.warning(f"All tags were filtered out. Original tags: {original_tags}")
        
        if "use_cases" in result and isinstance(result["use_cases"], list):
            original_use_cases = result["use_cases"].copy()
            result["use_cases"] = normalize_list_to_predefined(result["use_cases"], ALLOWED_USE_CASES)
            if len(result["use_cases"]) == 0 and len(original_use_cases) > 0:
                logger.warning(f"All use_cases were filtered out. Original use_cases: {original_use_cases}")
        
        if "tone_fit" in result and isinstance(result["tone_fit"], list):
            original_tone_fit = result["tone_fit"].copy()
            result["tone_fit"] = normalize_list_to_predefined(result["tone_fit"], ALLOWED_TONES)
            if len(result["tone_fit"]) == 0 and len(original_tone_fit) > 0:
                logger.warning(f"All tone_fit were filtered out. Original tone_fit: {original_tone_fit}")
        
        # Remove format and platform if present (not needed for text templates)
        result.pop("format", None)
        result.pop("platform", None)
        
        # Ensure required fields exist
        if "category" not in result:
            logger.warning("Category missing from LLM response, defaulting to 'tips'")
            result["category"] = "tips"
        if "tags" not in result:
            result["tags"] = []
        if "use_cases" not in result:
            result["use_cases"] = []
        if "tone_fit" not in result:
            result["tone_fit"] = ["professional"]
        
        logger.info(f"Final normalized result: category={result.get('category')}, tags_count={len(result.get('tags', []))}, use_cases_count={len(result.get('use_cases', []))}, tone_fit={result.get('tone_fit')}")
        
        return result

    except Exception as e:
        # Log the error for debugging
        logger.error(f"LLM analysis failed: {e}", exc_info=True)
        
        # Return sensible defaults if LLM fails
        return {
            "category": "tips",
            "tags": [],
            "use_cases": [],
            "tone_fit": ["professional"],
            "suggested_name": name,
            "suggested_description": description,
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

    # Normalize user-provided values to predefined lists
    normalized_tags = None
    if user_provided_tags:
        normalized_tags = normalize_list_to_predefined(user_provided_tags, ALLOWED_TAGS)
    
    normalized_use_cases = None
    if user_provided_use_cases:
        normalized_use_cases = normalize_list_to_predefined(user_provided_use_cases, ALLOWED_USE_CASES)
    
    normalized_tone_fit = None
    if user_provided_tone_fit:
        normalized_tone_fit = normalize_list_to_predefined(user_provided_tone_fit, ALLOWED_TONES)
    
    # Merge with user-provided values (user values take precedence, but normalized)
    result = {
        "variables": variables,
        "category": user_provided_category or llm_analysis.get("category", "tips"),
        "tags": normalized_tags if normalized_tags else llm_analysis.get("tags", []),
        "use_cases": normalized_use_cases if normalized_use_cases else llm_analysis.get("use_cases", []),
        "tone_fit": normalized_tone_fit if normalized_tone_fit else llm_analysis.get("tone_fit", ["professional"]),
        "suggested_name": llm_analysis.get("suggested_name"),
        "suggested_description": llm_analysis.get("suggested_description"),
    }

    return result
