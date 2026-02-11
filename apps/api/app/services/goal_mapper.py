"""Goal mapping service for template recommendations.

Maps user goals to template categories, use cases, and tags for accurate matching.
"""

from app.models.template import TemplateCategory
from app.templates.constants import ALLOWED_USE_CASES, ALLOWED_TAGS


class GoalMapper:
    """Maps goals to template metadata for recommendation matching."""

    # Comprehensive goal mappings
    GOAL_MAPPINGS = {
        "thought_leadership": {
            "categories": [
                TemplateCategory.FRAMEWORK,
                TemplateCategory.CONTRARIAN,
                TemplateCategory.MYTH_BUSTER,
                TemplateCategory.LESSONS,
                TemplateCategory.COMMON_MISTAKES,
            ],
            "use_cases": [
                "building thought leadership",
                "establishing expertise in a niche",
                "explaining frameworks and methodologies",
                "challenging conventional wisdom",
                "debunking industry misconceptions",
            ],
            "tags": [
                "thought-leadership",
                "expertise",
                "leadership",
                "strategy",
                "industry-insights",
                "management",
                "growth",
            ],
        },
        "engagement": {
            "categories": [
                TemplateCategory.QUESTION,
                TemplateCategory.CONTRARIAN,
                TemplateCategory.STORY,
                TemplateCategory.COMPARISON,
            ],
            "use_cases": [
                "asking thought-provoking questions",
                "creating controversy and discussion",
                "engaging with trending topics",
                "comparing different approaches or tools",
                "responding to industry events",
            ],
            "tags": [
                "communication",
                "social-media",
                "linkedin",
            ],
        },
        "educate": {
            "categories": [
                TemplateCategory.TIPS,
                TemplateCategory.FRAMEWORK,
                TemplateCategory.LESSONS,
                TemplateCategory.LISTICLE,
                TemplateCategory.COMMON_MISTAKES,
            ],
            "use_cases": [
                "educational content about best practices",
                "providing actionable tips and advice",
                "explaining frameworks and methodologies",
                "explaining complex concepts simply",
                "providing quick wins and hacks",
            ],
            "tags": [
                "productivity",
                "content-creation",
                "writing",
                "public-speaking",
            ],
        },
        "inspire": {
            "categories": [
                TemplateCategory.STORY,
                TemplateCategory.LESSONS,
                TemplateCategory.FRAMEWORK,
            ],
            "use_cases": [
                "motivating and inspiring audience",
                "sharing personal experiences and lessons",
                "telling engaging stories",
            ],
            "tags": [
                "personal-branding",
                "coaching",
            ],
        },
        "share_experience": {
            "categories": [
                TemplateCategory.STORY,
                TemplateCategory.LESSONS,
                TemplateCategory.CASE_STUDY,
            ],
            "use_cases": [
                "sharing personal experiences and lessons",
                "telling engaging stories",
                "presenting case studies and examples",
                "sharing behind-the-scenes insights",
            ],
            "tags": [
                "personal-branding",
                "career",
                "entrepreneurship",
                "startups",
            ],
        },
        "promote": {
            "categories": [
                TemplateCategory.ANNOUNCEMENT,
                TemplateCategory.STORY,
                TemplateCategory.CASE_STUDY,
            ],
            "use_cases": [
                "announcing news and updates",
                "presenting case studies and examples",
                "responding to industry events",
            ],
            "tags": [
                "product",
                "business",
                "marketing",
                "sales",
            ],
        },
        "build_community": {
            "categories": [
                TemplateCategory.QUESTION,
                TemplateCategory.STORY,
                TemplateCategory.TIPS,
            ],
            "use_cases": [
                "asking thought-provoking questions",
                "engaging with trending topics",
                "sharing behind-the-scenes insights",
                "responding to industry events",
            ],
            "tags": [
                "networking",
                "communication",
                "team-building",
                "culture",
            ],
        },
        "showcase_expertise": {
            "categories": [
                TemplateCategory.FRAMEWORK,
                TemplateCategory.CASE_STUDY,
                TemplateCategory.TIPS,
            ],
            "use_cases": [
                "establishing expertise in a niche",
                "presenting case studies and examples",
                "explaining frameworks and methodologies",
            ],
            "tags": [
                "expertise",
                "consulting",
                "technology",
                "development",
                "design",
                "data",
                "analytics",
                "ai",
                "automation",
            ],
        },
        "debunk_myth": {
            "categories": [
                TemplateCategory.MYTH_BUSTER,
                TemplateCategory.CONTRARIAN,
                TemplateCategory.FRAMEWORK,
            ],
            "use_cases": [
                "debunking industry misconceptions",
                "challenging conventional wisdom",
            ],
            "tags": [
                "innovation",
                "technology",
                "remote-work",
            ],
        },
        "provide_value": {
            "categories": [
                TemplateCategory.TIPS,
                TemplateCategory.FRAMEWORK,
                TemplateCategory.LISTICLE,
            ],
            "use_cases": [
                "providing actionable tips and advice",
                "providing quick wins and hacks",
                "explaining complex concepts simply",
            ],
            "tags": [
                "productivity",
                "content-creation",
            ],
        },
        "start_conversation": {
            "categories": [
                TemplateCategory.QUESTION,
                TemplateCategory.CONTRARIAN,
                TemplateCategory.COMPARISON,
            ],
            "use_cases": [
                "asking thought-provoking questions",
                "creating controversy and discussion",
                "comparing different approaches or tools",
            ],
            "tags": [
                "communication",
                "social-media",
                "twitter",
            ],
        },
        "share_insights": {
            "categories": [
                TemplateCategory.LESSONS,
                TemplateCategory.FRAMEWORK,
                TemplateCategory.STORY,
            ],
            "use_cases": [
                "sharing personal experiences and lessons",
                "explaining frameworks and methodologies",
                "sharing behind-the-scenes insights",
            ],
            "tags": [
                "industry-insights",
                "expertise",
            ],
        },
        "build_authority": {
            "categories": [
                TemplateCategory.FRAMEWORK,
                TemplateCategory.MYTH_BUSTER,
                TemplateCategory.CASE_STUDY,
            ],
            "use_cases": [
                "building thought leadership",
                "establishing expertise in a niche",
                "presenting case studies and examples",
            ],
            "tags": [
                "expertise",
                "leadership",
                "thought-leadership",
                "finance",
                "investing",
                "fundraising",
            ],
        },
    }

    @classmethod
    def get_categories_for_goal(cls, goal: str) -> list[TemplateCategory]:
        """Get preferred template categories for a goal."""
        mapping = cls.GOAL_MAPPINGS.get(goal)
        if mapping:
            return mapping["categories"]
        return [TemplateCategory.TIPS, TemplateCategory.STORY]

    @classmethod
    def get_use_cases_for_goal(cls, goal: str) -> list[str]:
        """Get preferred use cases for a goal."""
        mapping = cls.GOAL_MAPPINGS.get(goal)
        if mapping:
            return mapping["use_cases"]
        return []

    @classmethod
    def get_tags_for_goal(cls, goal: str) -> list[str]:
        """Get preferred tags for a goal."""
        mapping = cls.GOAL_MAPPINGS.get(goal)
        if mapping:
            return mapping["tags"]
        return []

    @classmethod
    def get_all_mappings_for_goal(cls, goal: str) -> dict:
        """Get all mappings (categories, use_cases, tags) for a goal."""
        return cls.GOAL_MAPPINGS.get(
            goal,
            {
                "categories": [TemplateCategory.TIPS, TemplateCategory.STORY],
                "use_cases": [],
                "tags": [],
            },
        )
