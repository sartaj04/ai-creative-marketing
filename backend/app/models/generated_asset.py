"""
GeneratedAsset model for storing generated creative assets.
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.brand_profile import BrandProfile
    from app.models.template import Template
    from app.models.content_calendar import ContentCalendar


class Platform(str, Enum):
    """Supported social media platforms."""
    INSTAGRAM_FEED = "instagram_feed"
    INSTAGRAM_STORY = "instagram_story"
    INSTAGRAM_REEL = "instagram_reel"
    FACEBOOK = "facebook"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    GOOGLE_DISPLAY = "google_display"


class GeneratedAsset(Base):
    """Generated creative asset with image and copy."""
    
    __tablename__ = "generated_assets"
    
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
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("brand_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Platform and dimensions
    platform: Mapped[Platform] = mapped_column(
        SQLEnum(Platform),
        nullable=False
    )
    aspect_ratio: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="1:1"
    )
    
    # Generated image
    image_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    thumbnail_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    
    # Generated copy
    # {headline, subheadline, body, cta, hashtags[]}
    copy_text: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False
    )
    
    # Content language
    language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        nullable=False
    )
    
    # Campaign metadata
    # {campaign_name, campaign_type, festival, region, product_id}
    asset_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False
    )
    
    # User preferences
    is_favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    is_downloaded: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Status
    is_published: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
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
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="generated_assets"
    )
    brand_profile: Mapped["BrandProfile"] = relationship(
        "BrandProfile",
        back_populates="generated_assets"
    )
    template: Mapped[Optional["Template"]] = relationship(
        "Template",
        back_populates="generated_assets"
    )
    calendar_entries: Mapped[list["ContentCalendar"]] = relationship(
        "ContentCalendar",
        back_populates="asset",
        cascade="all, delete-orphan"
    )
    
    @property
    def headline(self) -> Optional[str]:
        """Get headline from copy."""
        return self.copy_text.get("headline")
    
    @property
    def cta(self) -> Optional[str]:
        """Get CTA from copy."""
        return self.copy_text.get("cta")
    
    @property
    def hashtags(self) -> list[str]:
        """Get hashtags from copy."""
        return self.copy_text.get("hashtags", [])
