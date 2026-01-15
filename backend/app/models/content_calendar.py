"""
ContentCalendar model for personal brand content scheduling.
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Enum as SQLEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.generated_asset import Platform

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.generated_asset import GeneratedAsset


class CalendarStatus(str, Enum):
    """Content calendar entry status."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"


class ContentCalendar(Base):
    """Content calendar for scheduling posts."""
    
    __tablename__ = "content_calendar"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    asset_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("generated_assets.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Scheduling
    scheduled_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    platform: Mapped[Platform] = mapped_column(
        SQLEnum(Platform),
        nullable=False
    )
    
    # Content (can be used without an asset)
    title: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True
    )
    
    # Status
    status: Mapped[CalendarStatus] = mapped_column(
        SQLEnum(CalendarStatus),
        default=CalendarStatus.DRAFT,
        nullable=False
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="calendar_entries"
    )
    asset: Mapped[Optional["GeneratedAsset"]] = relationship(
        "GeneratedAsset",
        back_populates="calendar_entries"
    )
