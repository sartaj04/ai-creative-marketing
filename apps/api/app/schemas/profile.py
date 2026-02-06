"""Profile schemas."""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.models.profile import ProfileType


class ProfileSourceCreate(BaseModel):
    """Schema for creating profile sources."""

    linkedin_url: Optional[str] = None


class ProfileSourceResponse(BaseModel):
    """Schema for profile source response."""

    id: UUID
    profile_id: UUID
    linkedin_url: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileCreate(BaseModel):
    """Schema for creating a profile."""

    name: str = Field(..., min_length=1, max_length=255)
    type: ProfileType = ProfileType.INDIVIDUAL
    description: Optional[str] = None
    location: Optional[str] = None
    sources: Optional[ProfileSourceCreate] = None


class ProfileUpdate(BaseModel):
    """Schema for updating a profile."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None


class ProfileResponse(BaseModel):
    """Schema for profile response."""

    id: UUID
    user_id: UUID
    type: ProfileType
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    location: Optional[Any] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    sources: Optional[ProfileSourceResponse] = None

    class Config:
        from_attributes = True


class ProfileListResponse(BaseModel):
    """Schema for profile list response."""

    profiles: list[ProfileResponse]
    total: int
