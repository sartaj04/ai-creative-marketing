"""
BrandScale AI - User Model
User account with authentication, subscription tier, and usage tracking.
"""
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import UserSegment, UserTier
from app.database import Base

if TYPE_CHECKING:
    from app.models.brand_profile import BrandProfile
    from app.models.content_calendar import ContentCalendar
    from app.models.generated_asset import GeneratedAsset


class User(Base):
    """
    User model representing registered accounts.
    
    Attributes:
        id: Primary key
        email: Unique email address
        password_hash: Bcrypt hashed password
        tier: Subscription tier (free/starter/pro)
        segment: Target segment (ecommerce/saas/personal)
        usage_count: Monthly generation count
        usage_reset_date: Date when usage count resets
        created_at: Account creation timestamp
        updated_at: Last update timestamp
    """
    
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(255), 
        unique=True, 
        nullable=False, 
        index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Subscription and segment
    tier: Mapped[UserTier] = mapped_column(
        Enum(UserTier, name="user_tier"),
        default=UserTier.FREE,
        nullable=False
    )
    segment: Mapped[UserSegment] = mapped_column(
        Enum(UserSegment, name="user_segment"),
        nullable=True  # Can be set later
    )
    
    # Usage tracking
    usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    usage_reset_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
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
    brand_profiles: Mapped[List["BrandProfile"]] = relationship(
        "BrandProfile",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    generated_assets: Mapped[List["GeneratedAsset"]] = relationship(
        "GeneratedAsset",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    content_calendar: Mapped[List["ContentCalendar"]] = relationship(
        "ContentCalendar",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', tier={self.tier.value})>"
    
    def can_generate(self) -> bool:
        """Check if user can generate more assets based on tier limits."""
        from app.config import TIER_LIMITS
        
        limit = TIER_LIMITS.get(self.tier, 0)
        if limit == -1:  # Unlimited
            return True
        return self.usage_count < limit
    
    def increment_usage(self) -> None:
        """Increment the usage counter."""
        self.usage_count += 1
    
    def reset_usage_if_needed(self) -> bool:
        """Reset usage counter if a month has passed. Returns True if reset."""
        from datetime import timedelta
        
        now = datetime.utcnow()
        if (now - self.usage_reset_date.replace(tzinfo=None)) >= timedelta(days=30):
            self.usage_count = 0
            self.usage_reset_date = now
            return True
        return False
