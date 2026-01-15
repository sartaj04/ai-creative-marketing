"""
Content calendar API endpoints (for personal brand segment).
"""
from datetime import datetime, date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.content_calendar import ContentCalendar, CalendarStatus
from app.models.generated_asset import Platform
from app.core.auth import get_current_user


router = APIRouter()


class CalendarEntryCreate(BaseModel):
    """Schema for creating calendar entry."""
    scheduled_date: datetime
    platform: Platform
    asset_id: Optional[UUID] = None
    title: Optional[str] = None
    notes: Optional[str] = None


class CalendarEntryUpdate(BaseModel):
    """Schema for updating calendar entry."""
    scheduled_date: Optional[datetime] = None
    platform: Optional[Platform] = None
    asset_id: Optional[UUID] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[CalendarStatus] = None


class CalendarEntryResponse(BaseModel):
    """Schema for calendar entry response."""
    id: UUID
    user_id: UUID
    asset_id: Optional[UUID] = None
    scheduled_date: datetime
    platform: Platform
    title: Optional[str] = None
    notes: Optional[str] = None
    status: CalendarStatus
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[CalendarEntryResponse])
async def list_calendar_entries(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    platform: Optional[Platform] = None,
    status: Optional[CalendarStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List calendar entries with optional date range filter.
    """
    query = select(ContentCalendar).where(ContentCalendar.user_id == current_user.id)
    
    if start_date:
        query = query.where(ContentCalendar.scheduled_date >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.where(ContentCalendar.scheduled_date <= datetime.combine(end_date, datetime.max.time()))
    if platform:
        query = query.where(ContentCalendar.platform == platform)
    if status:
        query = query.where(ContentCalendar.status == status)
    
    query = query.order_by(ContentCalendar.scheduled_date)
    
    result = await db.execute(query)
    entries = result.scalars().all()
    
    return entries


@router.post("/", response_model=CalendarEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_calendar_entry(
    entry_data: CalendarEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new calendar entry.
    """
    entry = ContentCalendar(
        user_id=current_user.id,
        scheduled_date=entry_data.scheduled_date,
        platform=entry_data.platform,
        asset_id=entry_data.asset_id,
        title=entry_data.title,
        notes=entry_data.notes,
        status=CalendarStatus.DRAFT
    )
    
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    
    return entry


@router.get("/{entry_id}", response_model=CalendarEntryResponse)
async def get_calendar_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific calendar entry.
    """
    result = await db.execute(
        select(ContentCalendar)
        .where(
            ContentCalendar.id == entry_id,
            ContentCalendar.user_id == current_user.id
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar entry not found"
        )
    
    return entry


@router.patch("/{entry_id}", response_model=CalendarEntryResponse)
async def update_calendar_entry(
    entry_id: UUID,
    entry_update: CalendarEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a calendar entry.
    """
    result = await db.execute(
        select(ContentCalendar)
        .where(
            ContentCalendar.id == entry_id,
            ContentCalendar.user_id == current_user.id
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar entry not found"
        )
    
    update_data = entry_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)
    
    await db.commit()
    await db.refresh(entry)
    
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a calendar entry.
    """
    result = await db.execute(
        select(ContentCalendar)
        .where(
            ContentCalendar.id == entry_id,
            ContentCalendar.user_id == current_user.id
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar entry not found"
        )
    
    await db.delete(entry)
    await db.commit()


@router.post("/{entry_id}/schedule", response_model=CalendarEntryResponse)
async def schedule_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark an entry as scheduled.
    """
    result = await db.execute(
        select(ContentCalendar)
        .where(
            ContentCalendar.id == entry_id,
            ContentCalendar.user_id == current_user.id
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar entry not found"
        )
    
    entry.status = CalendarStatus.SCHEDULED
    await db.commit()
    await db.refresh(entry)
    
    return entry
