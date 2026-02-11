"""Template matcher - finds best templates for a given context."""
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.draft import DraftFormat
from app.models.template import Template, TemplateCategory, TemplateUsage


class TemplateMatcher:
    """Matcher for finding best templates based on context."""

    def __init__(self, db: AsyncSession):
        """Initialize matcher with database session."""
        self.db = db

    async def find_matches(
        self,
        profile_id: UUID,
        topic: Optional[str] = None,
        format: Optional[DraftFormat] = None,
        category: Optional[TemplateCategory] = None,
        tone_preferences: Optional[dict[str, float]] = None,
        limit: int = 5,
    ) -> list[tuple[Template, float]]:
        """Find matching templates with scores.

        Args:
            profile_id: Profile to match for
            topic: Optional topic to match
            format: Optional format preference
            category: Optional category filter
            tone_preferences: Optional tone preferences
            limit: Maximum templates to return

        Returns:
            List of (template, score) tuples
        """
        # Build base query
        query = select(Template).where(Template.is_active == True)

        if format:
            query = query.where(Template.format == format)

        if category:
            query = query.where(Template.category == category)

        result = await self.db.execute(query.limit(limit * 3))
        templates = result.scalars().all()

        # Score each template
        scored = []
        for template in templates:
            score = await self._calculate_score(
                template,
                profile_id,
                topic,
                tone_preferences,
            )
            scored.append((template, score))

        # Sort by score descending
        scored.sort(key=lambda x: x[1], reverse=True)

        return scored[:limit]

    async def _calculate_score(
        self,
        template: Template,
        profile_id: UUID,
        topic: Optional[str],
        tone_preferences: Optional[dict[str, float]],
    ) -> float:
        """Calculate match score for a template.

        Args:
            template: Template to score
            profile_id: Profile ID for historical data
            topic: Optional topic to match
            tone_preferences: Optional tone preferences

        Returns:
            Score between 0 and 1
        """
        score = 0.5  # Base score

        # Topic relevance (simple keyword matching)
        if topic and template.tags:
            topic_lower = topic.lower()
            matching_tags = sum(
                1 for tag in template.tags
                if tag.lower() in topic_lower or topic_lower in tag.lower()
            )
            if matching_tags > 0:
                score += min(matching_tags * 0.1, 0.2)

        # Tone fit
        if tone_preferences and template.tone_fit:
            tone_overlap = len(
                set(template.tone_fit) &
                set(tone_preferences.keys())
            )
            score += tone_overlap * 0.05

        # Historical performance for this profile
        usage_result = await self.db.execute(
            select(
                func.count(TemplateUsage.id).label("total"),
                func.sum(
                    func.cast(TemplateUsage.was_approved, type_=func.integer())
                ).label("approved"),
            ).where(
                TemplateUsage.template_id == template.id,
                TemplateUsage.profile_id == profile_id,
            )
        )
        usage_stats = usage_result.first()

        if usage_stats and usage_stats.total and usage_stats.total > 0:
            approval_rate = (usage_stats.approved or 0) / usage_stats.total
            # Weight historical performance heavily
            score = score * 0.4 + approval_rate * 0.6

        # Recency penalty (avoid using same template repeatedly)
        recent_usage = await self.db.execute(
            select(func.count(TemplateUsage.id)).where(
                TemplateUsage.template_id == template.id,
                TemplateUsage.profile_id == profile_id,
            )
        )
        recent_count = recent_usage.scalar() or 0
        if recent_count > 3:
            score *= 0.8  # Slight penalty for overused templates

        return min(max(score, 0.0), 1.0)

    async def get_category_for_topic(self, topic: str) -> TemplateCategory:
        """Suggest a template category based on topic.

        Args:
            topic: Topic string

        Returns:
            Suggested template category
        """
        topic_lower = topic.lower()

        # Simple keyword-based category suggestion
        if any(x in topic_lower for x in ["myth", "misconception", "wrong", "truth"]):
            return TemplateCategory.MYTH_BUSTER
        if any(x in topic_lower for x in ["tip", "advice", "how to", "guide"]):
            return TemplateCategory.TIPS
        if any(x in topic_lower for x in ["story", "journey", "experience", "learned"]):
            return TemplateCategory.STORY
        if any(x in topic_lower for x in ["framework", "system", "process", "step"]):
            return TemplateCategory.FRAMEWORK
        if any(x in topic_lower for x in ["unpopular", "controversial", "hot take"]):
            return TemplateCategory.CONTRARIAN
        if any(x in topic_lower for x in ["mistake", "error", "avoid", "trap", "fallacy", "wrong", "fail"]):
            return TemplateCategory.COMMON_MISTAKES
        if any(x in topic_lower for x in ["lesson", "mistake", "failure"]):
            return TemplateCategory.LESSONS
        if any(x in topic_lower for x in ["vs", "versus", "compare", "difference"]):
            return TemplateCategory.COMPARISON
        if any(x in topic_lower for x in ["announce", "launch", "release", "introducing", "update", "news"]):
            return TemplateCategory.ANNOUNCEMENT
        if any(x in topic_lower for x in ["case study", "case_study", "example", "success story", "client", "result"]):
            return TemplateCategory.CASE_STUDY
        if any(x in topic_lower for x in ["question", "ask", "wonder", "curious", "what if", "why do"]):
            return TemplateCategory.QUESTION
        if any(x in topic_lower for x in ["list", "things", "reasons", "ways", "tools", "resources"]):
            return TemplateCategory.LISTICLE

        return TemplateCategory.LISTICLE  # Default
