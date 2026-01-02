"""
BrandScale AI - Content Calendar Model
Schedule and track social media posts.
"""
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import ContentStatus, Platform
from app.database import Base

if TYPE_CHECKING:
    from app.models.generated_asset import GeneratedAsset
    from app.models.user import User


class ContentCalendar(Base):
    """
    Content calendar for scheduling posts.
    
    Attributes:
        id: Primary key
        user_id: Foreign key to User
        asset_id: Foreign key to GeneratedAsset
        platform: Target platform
        post_date: Scheduled post date
        post_time: Optional specific time
        status: Current status (draft/scheduled/published)
        notes: User notes
        external_post_id: ID from social platform after publishing
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    
    __tablename__ = "content_calendar"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    asset_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("generated_assets.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Scheduling
    platform: Mapped[Platform] = mapped_column(
        Enum(Platform, name="calendar_platform"),
        nullable=False
    )
    post_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    post_time: Mapped[Optional[str]] = mapped_column(
        String(10),  # Format: "HH:MM"
        nullable=True
    )
    
    # Status
    status: Mapped[ContentStatus] = mapped_column(
        Enum(ContentStatus, name="content_status"),
        default=ContentStatus.DRAFT,
        nullable=False
    )
    
    # Additional info
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    external_post_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Timestamps
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
    user: Mapped["User"] = relationship("User", back_populates="content_calendar")
    asset: Mapped["GeneratedAsset"] = relationship(
        "GeneratedAsset",
        back_populates="calendar_entries"
    )
    
    def __repr__(self) -> str:
        return f"<ContentCalendar(id={self.id}, date={self.post_date}, status={self.status.value})>"
    
    def mark_scheduled(self) -> None:
        """Mark the content as scheduled."""
        self.status = ContentStatus.SCHEDULED
    
    def mark_published(self, external_id: Optional[str] = None) -> None:
        """Mark the content as published."""
        self.status = ContentStatus.PUBLISHED
        if external_id:
            self.external_post_id = external_id
