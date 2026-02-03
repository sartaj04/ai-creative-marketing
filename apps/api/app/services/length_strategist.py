"""Length Strategist - Intelligent content length decision agent.

Now content-mode-aware: observer posts can be very short (40 words),
narrator posts can be long (500+ words), learner posts are medium, etc.
"""
import logging
import random
from typing import Dict, Optional

from app.llm.provider import get_llm_provider

logger = logging.getLogger(__name__)


LENGTH_STRATEGIST_PROMPT = """You are a content length strategist. Your goal is to determine the optimal post length for MAXIMUM IMPACT and UNIQUESNESS.
Avoid "average" or "standard" lengths unless absolutely necessary.

Given a topic, template, content mode, and context, determine the optimal post length range.

Consider:
1. **Topic complexity**:
   - Simple idea? Go SHORT and punchy (50-120 words).
   - Deep dive? Go LONG and detailed (350-600 words).
   - Nuanced take? Go MEDIUM (200-350 words).
2. **Content type**:
   - Hot takes/contrarian views: 50-150 words (short is powerful)
   - Personal Stories: 250-500 words (needs detail)
   - Frameworks/How-tos: 300-600 words (needs depth)
   - Tips/Listicles: 150-350 words
   - Questions/Observations: 40-100 words (very short)
3. **Uniqueness**:
   - Don't just pick "150-250". That is boring.
   - If the topic allows, push the boundaries (very short or deeply long).
4. **Template constraints**:
   - fixed: Must stay within template's min/max (rigid structure)
   - semi_flexible: Prefer template range but adjust ±20%
   - flexible: Full freedom to optimize
5. **User's patterns**: {user_length_patterns}
6. **Content mode**: {content_mode}
   - observer: Often VERY SHORT (40-120 words). Observations don't need padding. A 3-line observation is perfect.
   - skeptic: Often SHORT (60-180 words). Sharp, pointed, direct.
   - learner: MEDIUM (100-300 words). Thinking out loud, exploring.
   - builder: MEDIUM-LONG (150-400 words). Describing what you're making with enough detail.
   - narrator: Often LONG (200-600 words). Stories need room to breathe.
   - explainer: Varies by complexity (100-500 words). Match depth to concept.
   - advisor: SHORT to MEDIUM (80-250 words). Recommendations should be crisp.

TEMPLATE FLEXIBILITY RULES:
- If flexibility = "fixed" AND template has min/max: MUST stay within that range.
- Otherwise: Optimize for the TOPIC and CONTENT MODE.

INPUT:
Topic: {topic}
Template Category: {template_category}
Template Flexibility: {template_flexibility}
Template Min/Max: {template_min}-{template_max} words
Brief Description: {brief}
Content Mode: {content_mode}

Return ONLY valid JSON:
{{
  "target_min_words": 120,
  "target_max_words": 180,
  "reasoning": "This topic is a simple observation. A short, punchy post (under 200 words) will stand out more than a padded medium-length post.",
  "structure_suggestion": "Short hook + single key insight + question."
}}"""


class LengthStrategistService:
    """Service for determining optimal content length."""

    def __init__(self):
        """Initialize Length Strategist service."""
        self.llm_provider = get_llm_provider()

    async def determine_optimal_length(
        self,
        topic: str,
        template_category: Optional[str] = None,
        template_flexibility: str = "flexible",
        template_min: Optional[int] = None,
        template_max: Optional[int] = None,
        brief_description: Optional[str] = None,
        user_length_patterns: Optional[str] = None,
        variance_factor: float = 0.15,  # +/- 15% random variance
        content_mode: Optional[str] = None,
    ) -> Dict[str, any]:
        """
        Determine optimal content length for given topic and constraints.

        Args:
            topic: The main topic/title of the content
            template_category: Category like "myth_buster", "tips", "story", etc.
            template_flexibility: "fixed", "semi_flexible", or "flexible"
            template_min: Minimum word count (if template has constraint)
            template_max: Maximum word count (if template has constraint)
            brief_description: Brief content description or outline
            user_length_patterns: User's typical length distribution
            variance_factor: Random variance to add to result (0.0 - 0.5)
            content_mode: Content mode (observer, learner, narrator, etc.)

        Returns:
            Dict with:
                - target_min_words: Minimum target word count
                - target_max_words: Maximum target word count
                - reasoning: Why this length is optimal
                - structure_suggestion: How to structure the content
        """
        try:
            # Format user patterns
            user_patterns = user_length_patterns or "No user patterns available - optimize freely"

            # Format brief
            brief = brief_description or "No additional description provided"

            # Format content mode
            mode = content_mode or "general"

            # Create prompt
            prompt = LENGTH_STRATEGIST_PROMPT.format(
                topic=topic,
                template_category=template_category or "general",
                template_flexibility=template_flexibility,
                template_min=template_min or "none",
                template_max=template_max or "none",
                user_length_patterns=user_patterns,
                brief=brief,
                content_mode=mode,
            )

            logger.info(
                f"Determining optimal length for topic: {topic[:50]}... "
                f"(template: {template_category}, flexibility: {template_flexibility}, mode: {mode})"
            )

            # Call LLM
            response = await self.llm_provider.generate_structured(
                prompt=prompt,
                response_schema={
                    "type": "object",
                    "properties": {
                        "target_min_words": {"type": "integer"},
                        "target_max_words": {"type": "integer"},
                        "reasoning": {"type": "string"},
                        "structure_suggestion": {"type": "string"},
                    },
                    "required": ["target_min_words", "target_max_words", "reasoning"],
                },
            )

            # Validate response
            if not response or not isinstance(response, dict):
                logger.error("Invalid response from Length Strategist")
                return self._get_fallback_length(template_category, template_min, template_max, content_mode)

            # Ensure min <= max
            if response["target_min_words"] > response["target_max_words"]:
                response["target_min_words"], response["target_max_words"] = (
                    response["target_max_words"],
                    response["target_min_words"],
                )

            # Apply random variance if NOT fixed
            if template_flexibility != "fixed":
                variance = random.uniform(-variance_factor, variance_factor)
                # Apply to both/either bound to shift the range slightly
                shift = int(response["target_min_words"] * variance)

                # Ensure we don't go too low (minimum 30 words)
                new_min = max(30, response["target_min_words"] + shift)
                new_max = max(new_min + 20, response["target_max_words"] + shift)

                response["target_min_words"] = int(new_min)
                response["target_max_words"] = int(new_max)
                response["reasoning"] += f" (Applied {variance*100:.1f}% unique variance)"

            # Validate against template constraints if fixed
            if template_flexibility == "fixed" and template_min and template_max:
                # Clamp to template range
                response["target_min_words"] = max(response["target_min_words"], template_min)
                response["target_max_words"] = min(response["target_max_words"], template_max)
                response["reasoning"] += f" (Constrained to template range: {template_min}-{template_max} words)"

            logger.info(
                f"Length decision: {response['target_min_words']}-{response['target_max_words']} words. "
                f"Reasoning: {response['reasoning'][:100]}..."
            )

            return response

        except Exception as e:
            logger.error(f"Error in Length Strategist: {e}", exc_info=True)
            return self._get_fallback_length(template_category, template_min, template_max, content_mode)

    def _get_fallback_length(
        self,
        template_category: Optional[str],
        template_min: Optional[int],
        template_max: Optional[int],
        content_mode: Optional[str] = None,
    ) -> Dict[str, any]:
        """Get fallback length if LLM call fails."""
        # If template has constraints, use those
        if template_min and template_max:
            return {
                "target_min_words": template_min,
                "target_max_words": template_max,
                "reasoning": "Using template constraints as fallback",
                "structure_suggestion": "Follow template structure",
            }

        # Content-mode-based fallbacks
        mode_lengths = {
            "observer": (40, 120),
            "skeptic": (60, 180),
            "learner": (100, 300),
            "builder": (150, 400),
            "narrator": (200, 500),
            "explainer": (150, 400),
            "advisor": (80, 250),
        }

        # Category-based fallbacks
        category_lengths = {
            "myth_buster": (250, 400),
            "tips": (200, 300),
            "story": (250, 450),
            "framework": (300, 500),
            "contrarian": (80, 150),
            "lessons": (200, 350),
            "listicle": (200, 300),
            "question": (60, 120),
            "comparison": (250, 400),
            "announcement": (100, 200),
            "case_study": (300, 500),
        }

        # Prefer content_mode if available, then template_category
        if content_mode and content_mode in mode_lengths:
            min_words, max_words = mode_lengths[content_mode]
        else:
            min_words, max_words = category_lengths.get(
                template_category, (150, 250)  # Default
            )

        # Add slight randomness to fallback too
        variance = random.randint(-20, 20)
        min_words = max(30, min_words + variance)
        max_words = max(min_words + 30, max_words + variance)

        return {
            "target_min_words": min_words,
            "target_max_words": max_words,
            "reasoning": f"Fallback length for {content_mode or template_category or 'general'} content",
            "structure_suggestion": "Standard structure with hook, body, and closer",
        }
