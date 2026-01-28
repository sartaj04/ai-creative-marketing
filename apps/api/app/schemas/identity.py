"""Identity and Style schemas."""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class IdentityGraphResponse(BaseModel):
    """Schema for identity graph response."""

    id: UUID
    profile_id: UUID
    themes: list[str] = Field(default_factory=list)
    expertise_keywords: list[str] = Field(default_factory=list)
    tone_markers: dict[str, float] = Field(default_factory=dict)
    audience_notes: dict[str, Any] = Field(default_factory=dict)
    authority_angles: list[str] = Field(default_factory=list)
    narrative_themes: list[str] = Field(default_factory=list)
    version: int
    last_updated_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class IdentityGraphUpdate(BaseModel):
    """Schema for updating identity graph."""

    themes: Optional[list[str]] = None
    expertise_keywords: Optional[list[str]] = None
    tone_markers: Optional[dict[str, float]] = None
    audience_notes: Optional[dict[str, Any]] = None
    authority_angles: Optional[list[str]] = None
    narrative_themes: Optional[list[str]] = None


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

    class Config:
        from_attributes = True


class StyleProfileUpdate(BaseModel):
    """Schema for updating style profile."""

    tone_sliders: Optional[dict[str, float]] = None
    format_preferences: Optional[dict[str, float]] = None
    taboo_list: Optional[list[str]] = None
    preferred_hooks: Optional[list[str]] = None
