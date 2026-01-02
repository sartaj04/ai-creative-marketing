"""
BrandScale AI - Generated Asset Model
Stores generated marketing creatives with copy and metadata.
"""
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import Platform
from app.database import Base

if TYPE_CHECKING:
    from app.models.brand_profile import BrandProfile
    from app.models.content_calendar import ContentCalendar
    from app.models.template import Template
    from app.models.user import User


class GeneratedAsset(Base):
    """
    Generated marketing asset with image, copy, and metadata.
    
    Attributes:
        id: Primary key
        user_id: Foreign key to User
        profile_id: Foreign key to BrandProfile
        template_id: Foreign key to Template
        platform: Target platform
        aspect_ratio: Image aspect ratio
        image_url: S3 URL of generated image
        copy_text: JSON with headline, body, cta, hashtags
        metadata: Additional metadata (generation params, etc.)
        generation_job_id: Associated background job ID
        status: Asset status
        created_at: Creation timestamp
        updated_at: Last update timestamp
    
    copy_text JSON structure:
        {
            "headline": "Main headline",
            "subheadline": "Secondary line",
            "body": "Body copy text",
            "cta": "Shop Now",
            "hashtags": ["#sale", "#fashion"],
            "language": "en"
        }
    
    metadata JSON structure:
        {
            "product_id": "...",
            "campaign_type": "sale|launch|awareness",
            "ai_model": "gpt-4-turbo",
            "temperature": 0.8,
            "render_time_ms": 2500,
            "file_size_bytes": 150000,
            "width": 1080,
            "height": 1080
        }
    """
    
    __tablename__ = "generated_assets"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("brand_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    template_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("templates.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Platform and format
    platform: Mapped[Platform] = mapped_column(
        Enum(Platform, name="asset_platform"),
        nullable=False,
        index=True
    )
    aspect_ratio: Mapped[str] = mapped_column(String(20), nullable=False, default="1:1")
    
    # Generated content
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    copy_text: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict
    )
    
    # Metadata
    metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=True,
        default=dict
    )
    
    # Job tracking
    generation_job_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
        index=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
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
    user: Mapped["User"] = relationship("User", back_populates="generated_assets")
    brand_profile: Mapped["BrandProfile"] = relationship(
        "BrandProfile",
        back_populates="generated_assets"
    )
    calendar_entries: Mapped[list["ContentCalendar"]] = relationship(
        "ContentCalendar",
        back_populates="asset",
        lazy="selectin"
    )
    
    def __repr__(self) -> str:
        return f"<GeneratedAsset(id={self.id}, platform={self.platform.value}, status='{self.status}')>"
    
    @property
    def headline(self) -> Optional[str]:
        """Get headline from copy text."""
        return self.copy_text.get("headline")
    
    @property
    def cta(self) -> Optional[str]:
        """Get CTA from copy text."""
        return self.copy_text.get("cta")
    
    @property
    def hashtags(self) -> list:
        """Get hashtags from copy text."""
        return self.copy_text.get("hashtags", [])
    
    def update_copy(
        self,
        headline: Optional[str] = None,
        subheadline: Optional[str] = None,
        body: Optional[str] = None,
        cta: Optional[str] = None,
        hashtags: Optional[list] = None
    ) -> None:
        """Update copy text fields."""
        if headline is not None:
            self.copy_text["headline"] = headline
        if subheadline is not None:
            self.copy_text["subheadline"] = subheadline
        if body is not None:
            self.copy_text["body"] = body
        if cta is not None:
            self.copy_text["cta"] = cta
        if hashtags is not None:
            self.copy_text["hashtags"] = hashtags
    
    def get_s3_key(self) -> str:
        """Get the S3 object key for this asset."""
        return f"{self.user_id}/{self.profile_id}/{self.id}.png"
