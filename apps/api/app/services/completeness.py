"""Identity completeness calculation service.

This module calculates identity completeness based on the defined schema.
It mirrors the frontend schema definition to ensure consistency.
"""
from typing import Any, Optional
from dataclasses import dataclass

# Field type definitions
FIELD_TYPE_STRING = "string"
FIELD_TYPE_TEXT = "text"
FIELD_TYPE_ARRAY = "array"
FIELD_TYPE_ARRAY_ENUM = "array_enum"
FIELD_TYPE_OBJECT_ARRAY = "object_array"
FIELD_TYPE_ENUM = "enum"
FIELD_TYPE_SLIDER_GROUP = "slider_group"
FIELD_TYPE_DICT = "dict"


@dataclass
class FieldSchema:
    """Schema definition for an identity field."""
    key: str
    label: str
    field_type: str
    required: bool
    source: str  # "identity_graph" or "style_profile"


# Define all identity fields and their requirements
# This should match the frontend schema exactly
IDENTITY_SCHEMA: list[FieldSchema] = [
    # Core region
    FieldSchema("current_role", "Current Role", FIELD_TYPE_STRING, True, "identity_graph"),
    FieldSchema("industry", "Industry", FIELD_TYPE_ENUM, True, "identity_graph"),
    FieldSchema("career_stage", "Career Stage", FIELD_TYPE_ENUM, False, "identity_graph"),
    FieldSchema("bio_summary", "Bio Summary", FIELD_TYPE_TEXT, False, "identity_graph"),
    
    # Expertise region
    FieldSchema("expertise_areas", "Expertise Areas", FIELD_TYPE_ARRAY_ENUM, True, "identity_graph"),
    FieldSchema("expertise_keywords", "Expertise Keywords", FIELD_TYPE_ARRAY, False, "identity_graph"),
    FieldSchema("career_highlights", "Career Highlights", FIELD_TYPE_ARRAY, False, "identity_graph"),
    FieldSchema("education", "Education", FIELD_TYPE_OBJECT_ARRAY, False, "identity_graph"),
    
    # Content region
    FieldSchema("content_pillars", "Content Pillars", FIELD_TYPE_ARRAY_ENUM, True, "identity_graph"),
    FieldSchema("narrative_themes", "Narrative Themes", FIELD_TYPE_ARRAY, False, "identity_graph"),
    FieldSchema("themes", "Topics", FIELD_TYPE_ARRAY, False, "identity_graph"),
    FieldSchema("preferred_hooks", "Preferred Hook Styles", FIELD_TYPE_ARRAY_ENUM, False, "style_profile"),
    
    # Strategy region
    FieldSchema("target_audience", "Target Audience", FIELD_TYPE_TEXT, True, "identity_graph"),
    FieldSchema("desired_positioning", "Desired Positioning", FIELD_TYPE_TEXT, False, "identity_graph"),
    FieldSchema("goals", "Goals", FIELD_TYPE_TEXT, False, "identity_graph"),
    FieldSchema("aspirations", "Aspirations", FIELD_TYPE_TEXT, False, "identity_graph"),
    
    # Character region
    FieldSchema("interests", "Interests", FIELD_TYPE_ARRAY_ENUM, False, "identity_graph"),
    FieldSchema("beliefs", "Core Beliefs", FIELD_TYPE_ARRAY, False, "identity_graph"),
    FieldSchema("contrarian_views", "Contrarian Views", FIELD_TYPE_ARRAY, False, "identity_graph"),
    FieldSchema("taboo_list", "Taboo Topics", FIELD_TYPE_ARRAY, False, "style_profile"),
    
    # Voice region
    FieldSchema("unique_angles", "Unique Angles", FIELD_TYPE_ARRAY, False, "identity_graph"),
    FieldSchema("authority_angles", "Authority Angles", FIELD_TYPE_ARRAY, False, "identity_graph"),
    FieldSchema("tone_sliders", "Tone Style", FIELD_TYPE_SLIDER_GROUP, False, "style_profile"),
    FieldSchema("format_preferences", "Format Preferences", FIELD_TYPE_SLIDER_GROUP, False, "style_profile"),
]


def is_field_empty(value: Any, field_type: str) -> bool:
    """Check if a field value is considered empty."""
    if value is None:
        return True
    
    if field_type in (FIELD_TYPE_STRING, FIELD_TYPE_TEXT, FIELD_TYPE_ENUM):
        return not value or (isinstance(value, str) and not value.strip())
    
    if field_type in (FIELD_TYPE_ARRAY, FIELD_TYPE_ARRAY_ENUM, FIELD_TYPE_OBJECT_ARRAY):
        return not isinstance(value, list) or len(value) == 0
    
    if field_type in (FIELD_TYPE_DICT, FIELD_TYPE_SLIDER_GROUP):
        return not isinstance(value, dict) or len(value) == 0
    
    return not value


@dataclass
class CompletenessResult:
    """Result of completeness calculation."""
    total: int
    filled: int
    required_total: int
    required_filled: int
    optional_total: int
    optional_filled: int
    missing_required: list[str]
    percentage: int


def calculate_completeness(
    identity_graph: Optional[dict] = None,
    style_profile: Optional[dict] = None,
) -> CompletenessResult:
    """
    Calculate identity completeness based on schema.
    
    Args:
        identity_graph: The identity graph data as a dict
        style_profile: The style profile data as a dict
    
    Returns:
        CompletenessResult with detailed metrics
    """
    identity_graph = identity_graph or {}
    style_profile = style_profile or {}
    
    total = 0
    filled = 0
    required_total = 0
    required_filled = 0
    optional_total = 0
    optional_filled = 0
    missing_required: list[str] = []
    
    for field in IDENTITY_SCHEMA:
        # Get value from appropriate source
        source = style_profile if field.source == "style_profile" else identity_graph
        value = source.get(field.key)
        
        is_empty = is_field_empty(value, field.field_type)
        
        total += 1
        
        if field.required:
            required_total += 1
            if not is_empty:
                required_filled += 1
                filled += 1
            else:
                missing_required.append(field.key)
        else:
            optional_total += 1
            if not is_empty:
                optional_filled += 1
                filled += 1
    
    # Calculate percentage with weighted scoring
    # Required fields count as 2 points, optional as 1
    required_weight = 2
    max_score = (required_total * required_weight) + optional_total
    actual_score = (required_filled * required_weight) + optional_filled
    percentage = round((actual_score / max_score) * 100) if max_score > 0 else 0
    
    return CompletenessResult(
        total=total,
        filled=filled,
        required_total=required_total,
        required_filled=required_filled,
        optional_total=optional_total,
        optional_filled=optional_filled,
        missing_required=missing_required,
        percentage=percentage,
    )


def identity_graph_to_dict(identity_graph) -> dict:
    """Convert an IdentityGraph model to a dict for completeness calculation."""
    return {
        "current_role": identity_graph.current_role,
        "industry": identity_graph.industry,
        "career_stage": identity_graph.career_stage,
        "bio_summary": identity_graph.bio_summary,
        "expertise_areas": identity_graph.expertise_areas,
        "expertise_keywords": identity_graph.expertise_keywords,
        "career_highlights": identity_graph.career_highlights,
        "education": identity_graph.education,
        "content_pillars": identity_graph.content_pillars,
        "narrative_themes": identity_graph.narrative_themes,
        "themes": identity_graph.themes,
        "target_audience": identity_graph.target_audience,
        "desired_positioning": identity_graph.desired_positioning,
        "goals": identity_graph.goals,
        "aspirations": identity_graph.aspirations,
        "interests": identity_graph.interests,
        "beliefs": identity_graph.beliefs,
        "contrarian_views": identity_graph.contrarian_views,
        "unique_angles": identity_graph.unique_angles,
        "authority_angles": identity_graph.authority_angles,
        "tone_markers": identity_graph.tone_markers,
        "audience_notes": identity_graph.audience_notes,
    }


def style_profile_to_dict(style_profile) -> dict:
    """Convert a StyleProfile model to a dict for completeness calculation."""
    if not style_profile:
        return {}
    return {
        "tone_sliders": style_profile.tone_sliders,
        "format_preferences": style_profile.format_preferences,
        "preferred_hooks": style_profile.preferred_hooks,
        "taboo_list": style_profile.taboo_list,
    }
