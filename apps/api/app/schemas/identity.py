"""Identity and Style schemas."""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class IdentityGraphResponse(BaseModel):
    """Schema for identity graph response - includes all fields from model."""

    id: UUID
    profile_id: UUID
    
    # Core identity
    current_role: Optional[str] = None
    industry: Optional[str] = None
    
    # Professional details
    expertise_areas: list[str] = Field(default_factory=list)
    career_highlights: list[str] = Field(default_factory=list)
    bio_summary: Optional[str] = None
    
    # Brand Strategy
    target_audience: Optional[str] = None
    desired_positioning: Optional[str] = None
    unique_angles: list[str] = Field(default_factory=list)
    aspirations: Optional[str] = None
    goals: Optional[str] = None
    
    # Personality & Content
    interests: list[str] = Field(default_factory=list)
    beliefs: list[str] = Field(default_factory=list)

    # Deep Identity (auto-extracted from LinkedIn posts)
    stories: list[Any] = Field(default_factory=list)
    opinion_statements: list[str] = Field(default_factory=list)
    interest_details: dict[str, str] = Field(default_factory=dict)

    # Content Strategy
    content_pillars: list[str] = Field(default_factory=list)
    narrative_themes: list[str] = Field(default_factory=list)

    # Credibility markers
    authority_angles: list[str] = Field(default_factory=list)

    # Metadata
    completeness_score: int = 0
    version: int
    last_updated_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class IdentityGraphUpdate(BaseModel):
    """Schema for updating identity graph - all editable fields."""

    # Core identity
    current_role: Optional[str] = None
    industry: Optional[str] = None
    
    # Professional details
    expertise_areas: Optional[list[str]] = None
    career_highlights: Optional[list[str]] = None
    bio_summary: Optional[str] = None
    
    # Brand Strategy
    target_audience: Optional[str] = None
    desired_positioning: Optional[str] = None
    unique_angles: Optional[list[str]] = None
    aspirations: Optional[str] = None
    goals: Optional[str] = None
    
    # Personality & Content
    interests: Optional[list[str]] = None
    beliefs: Optional[list[str]] = None

    # Deep Identity (auto-extracted from LinkedIn posts)
    stories: Optional[list[Any]] = None
    opinion_statements: Optional[list[str]] = None
    interest_details: Optional[dict[str, str]] = None

    # Content Strategy
    content_pillars: Optional[list[str]] = None
    narrative_themes: Optional[list[str]] = None

    # Credibility markers
    authority_angles: Optional[list[str]] = None



class ToneSliders(BaseModel):
    """Schema for tone sliders."""

    formal_casual: float = Field(0.5, ge=0, le=1)
    technical_simple: float = Field(0.5, ge=0, le=1)
    serious_playful: float = Field(0.5, ge=0, le=1)
    humble_confident: float = Field(0.5, ge=0, le=1)


class FormatPreferences(BaseModel):
    """Schema for format preferences."""

    post: float = Field(0.5, ge=0, le=1)
    thread: float = Field(0.3, ge=0, le=1)
    carousel: float = Field(0.2, ge=0, le=1)


class StyleProfileResponse(BaseModel):
    """Schema for style profile response."""

    id: UUID
    profile_id: UUID
    tone_sliders: dict[str, float]
    format_preferences: dict[str, float]
    taboo_list: list[str] = Field(default_factory=list)
    preferred_hooks: list[str] = Field(default_factory=list)
    weights: dict[str, Any] = Field(default_factory=dict)
    version: int
    created_at: datetime
    updated_at: datetime
    writing_samples_count: int = 0

    class Config:
        from_attributes = True


class StyleProfileUpdate(BaseModel):
    """Schema for updating style profile."""

    tone_sliders: Optional[dict[str, float]] = None
    format_preferences: Optional[dict[str, float]] = None
    taboo_list: Optional[list[str]] = None
    preferred_hooks: Optional[list[str]] = None


class TimelineEventResponse(BaseModel):
    """Schema for timeline event."""
    id: UUID
    timeline_id: UUID
    title: str
    description: Optional[str] = None
    event_type: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_current: bool
    emotional_core: Optional[str] = None
    lessons_learned: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    source: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TimelineEventUpdate(BaseModel):
    """Schema for updating a timeline event (enrichment from identity page)."""
    title: Optional[str] = None
    description: Optional[str] = None
    emotional_core: Optional[str] = None
    lessons_learned: Optional[list[str]] = None
    tags: Optional[list[str]] = None


class TimelineResponse(BaseModel):
    """Schema for timeline."""
    id: UUID
    identity_graph_id: UUID
    primary_focus: Optional[str] = None
    narrative_arc: Optional[str] = None
    events: list[TimelineEventResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
