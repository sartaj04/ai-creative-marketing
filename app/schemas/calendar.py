"""
BrandScale AI - Calendar Schemas
Pydantic models for content calendar.
"""
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.config import ContentStatus, Platform


class CalendarEntryCreate(BaseModel):
    """Schema for creating a calendar entry."""
    
    asset_id: int
    platform: Platform
    post_date: date
    post_time: Optional[str] = Field(
        None, 
        pattern=r"^([01]\d|2[0-3]):([0-5]\d)$"
    )  # HH:MM format
    notes: Optional[str] = None


class CalendarEntryUpdate(BaseModel):
    """Schema for updating a calendar entry."""
    
    platform: Optional[Platform] = None
    post_date: Optional[date] = None
    post_time: Optional[str] = Field(
        None,
        pattern=r"^([01]\d|2[0-3]):([0-5]\d)$"
    )
    status: Optional[ContentStatus] = None
    notes: Optional[str] = None


class CalendarEntryResponse(BaseModel):
    """Schema for calendar entry response."""
    
    id: int
    user_id: int
    asset_id: int
    platform: Platform
    post_date: date
    post_time: Optional[str] = None
    status: ContentStatus
    notes: Optional[str] = None
    external_post_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CalendarListResponse(BaseModel):
    """Schema for list of calendar entries."""
    
    entries: List[CalendarEntryResponse]
    total: int


class CalendarFilterParams(BaseModel):
    """Query parameters for filtering calendar entries."""
    
    platform: Optional[Platform] = None
    status: Optional[ContentStatus] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)
