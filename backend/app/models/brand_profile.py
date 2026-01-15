"""
BrandProfile model for storing scraped brand data.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SQLEnum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.user import UserSegment

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.generated_asset import GeneratedAsset


class BrandProfile(Base):
    """Brand profile containing scraped and user-provided brand data."""
    
    __tablename__ = "brand_profiles"
    
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
    profile_type: Mapped[UserSegment] = mapped_column(
        SQLEnum(UserSegment),
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    website_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    logo_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    
    # Brand assets stored as JSON
    # For E-commerce: {colors[], fonts[], products[{image, title, price, category}]}
    # For SaaS: {colors[], fonts[], features[], screenshots[], testimonials[]}
    # For Personal: {colors[], themes[], sample_posts[]}
    brand_assets: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False
    )
    
    # Voice profile for content generation
    # {tone: str, style: str, keywords: [], sample_texts: []}
    voice_profile: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False
    )
    
    # Industry/niche for better targeting
    industry: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    
    # Target audience
    target_audience: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    
    # Scraping status
    is_scraped: Mapped[bool] = mapped_column(
        default=False,
        nullable=False
    )
    last_scraped_at: Mapped[Optional[datetime]] = mapped_column(
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
        back_populates="brand_profiles"
    )
    generated_assets: Mapped[List["GeneratedAsset"]] = relationship(
        "GeneratedAsset",
        back_populates="brand_profile",
        cascade="all, delete-orphan"
    )
    
    @property
    def primary_color(self) -> Optional[str]:
        """Get primary brand color."""
        colors = self.brand_assets.get("colors", [])
        return colors[0] if colors else None
    
    @property
    def secondary_color(self) -> Optional[str]:
        """Get secondary brand color."""
        colors = self.brand_assets.get("colors", [])
        return colors[1] if len(colors) > 1 else None
