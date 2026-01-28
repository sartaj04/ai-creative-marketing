"""Draft schemas."""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.draft import DraftAction, DraftFormat, DraftStatus, PlatformType


class DraftResponse(BaseModel):
    """Schema for draft response."""

    id: UUID
    profile_id: UUID
    opportunity_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
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
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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
