"""Generator request/response schemas."""
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ScratchGenerateRequest(BaseModel):
    """Request schema for generating from scratch."""

    profile_id: UUID
    topic: str = Field(..., min_length=1, max_length=500)
    key_points: list[str] = Field(default_factory=list, max_length=10)
    goal: str = Field(..., min_length=1, max_length=200)
    template_id: Optional[UUID] = Field(default=None, description="Optional template for structural guidance")


class YouTubeGenerateRequest(BaseModel):
    """Request schema for generating from YouTube video."""

    profile_id: UUID
    youtube_url: str = Field(..., min_length=1)
    template_id: Optional[UUID] = Field(default=None, description="Optional template for structural guidance")


class ArticleGenerateRequest(BaseModel):
    """Request schema for generating from article URL."""

    profile_id: UUID
    article_url: str = Field(..., min_length=1)
    template_id: Optional[UUID] = Field(default=None, description="Optional template for structural guidance")


class FormatGenerateRequest(BaseModel):
    """Request schema for formatting raw content."""

    profile_id: UUID
    content: str = Field(..., min_length=1, max_length=10000)
    template_id: Optional[UUID] = Field(default=None, description="Optional template for structural guidance")


class GeneratorResponse(BaseModel):
    """Response schema for all generator endpoints."""

    draft_id: UUID
    hook: str
    body: str
    topic: Optional[str] = None
    confidence: float
    message: str = "Draft generated successfully"

    class Config:
        from_attributes = True


# Template Recommendation Schemas

class TemplateRecommendation(BaseModel):
    """Schema for a recommended template."""

    id: UUID
    name: str
    description: Optional[str] = None
    category: str
    content: str
    match_score: float = Field(..., ge=0.0, le=1.0, description="How well this template matches the request")
    usage_count: int = 0
    tags: list[str] = []


class TemplateRecommendationsResponse(BaseModel):
    """Response schema for template recommendations."""

    templates: list[TemplateRecommendation]
    source_type: str
    topic_hint: Optional[str] = None
    goal: Optional[str] = None
