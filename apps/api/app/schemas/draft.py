"""Draft schemas."""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.draft import DraftAction, DraftFormat, DraftStatus, PlatformType
from app.schemas.media import MediaAssetResponse


class DraftSlideResponse(BaseModel):
    """Schema for a rendered draft slide."""

    id: UUID
    draft_id: UUID
    slide_template_id: Optional[UUID] = None
    rendered_html: str
    filled_variables: dict[str, Any] = Field(default_factory=dict)
    order: int
    created_at: datetime

    class Config:
        from_attributes = True


class DraftResponse(BaseModel):
    """Schema for draft response."""

    id: UUID
    profile_id: UUID
    opportunity_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
    visual_template_id: Optional[UUID] = None
    status: DraftStatus
    format: DraftFormat
    hook: str
    body: str
    topic: Optional[str] = None
    confidence: float
    sources_json: list[Any] = Field(default_factory=list)
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    platform: Optional[PlatformType] = None
    media_assets: list[MediaAssetResponse] = Field(default_factory=list)
    slides: list[DraftSlideResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DraftGenerateRequest(BaseModel):
    """Request to generate a draft from a saved VisualTemplate."""

    template_id: UUID = Field(..., description="UUID of saved VisualTemplate to use")
    profile_id: UUID = Field(..., description="Profile to generate the draft for")
    brand_context: Optional[dict[str, Any]] = Field(
        default=None,
        description=(
            "Optional brand overrides: {primary_color, secondary_color, "
            "font_family, persona_summary}. Auto-loaded from profile if omitted."
        ),
    )


class DraftListResponse(BaseModel):
    """Schema for draft list response."""

    drafts: list[DraftResponse]
    total: int
    limit: int
    offset: int


class DraftActionRequest(BaseModel):
    """Schema for draft action (swipe)."""

    action: DraftAction
    feedback: Optional[str] = None
    edited_hook: Optional[str] = None
    edited_body: Optional[str] = None


class DraftScheduleRequest(BaseModel):
    """Schema for scheduling a draft."""

    scheduled_time: datetime
    platform: PlatformType


class DraftStatusUpdate(BaseModel):
    """Schema for updating draft status."""

    status: DraftStatus


class DraftEventResponse(BaseModel):
    """Schema for draft event response."""

    id: UUID
    draft_id: UUID
    action: DraftAction
    feedback: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ScheduleResponse(BaseModel):
    """Schema for schedule response."""

    id: UUID
    draft_id: UUID
    scheduled_time: datetime
    platform: PlatformType
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
