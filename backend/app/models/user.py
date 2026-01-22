"""
User model for authentication and user management.
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Integer, DateTime, Enum as SQLEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.brand_profile import BrandProfile
    from app.models.generated_asset import GeneratedAsset
    from app.models.content_calendar import ContentCalendar
    from app.models.job_status import JobStatus


class UserTier(str, Enum):
    """User subscription tiers."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"


class UserSegment(str, Enum):
    """User business segment types."""
    ECOMMERCE = "ecommerce"
    SAAS = "saas"
    PERSONAL = "personal"


class User(Base):
    """User model for the platform."""
    
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    full_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    tier: Mapped[UserTier] = mapped_column(
        SQLEnum(UserTier),
        default=UserTier.FREE,
        nullable=False
    )
    segment: Mapped[Optional[UserSegment]] = mapped_column(
        SQLEnum(UserSegment),
        nullable=True
    )
    usage_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    usage_reset_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    razorpay_customer_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    razorpay_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False
    )
    is_verified: Mapped[bool] = mapped_column(
        default=False,
        nullable=False
    )
    is_admin: Mapped[bool] = mapped_column(
        default=False,
        nullable=False
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
    brand_profiles: Mapped[List["BrandProfile"]] = relationship(
        "BrandProfile",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    generated_assets: Mapped[List["GeneratedAsset"]] = relationship(
        "GeneratedAsset",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    calendar_entries: Mapped[List["ContentCalendar"]] = relationship(
        "ContentCalendar",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    jobs: Mapped[List["JobStatus"]] = relationship(
        "JobStatus",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    @property
    def usage_limit(self) -> int:
        """Get usage limit based on tier."""
        limits = {
            UserTier.FREE: 10,
            UserTier.STARTER: 100,
            UserTier.PRO: -1  # Unlimited
        }
        return limits.get(self.tier, 10)
    
    @property
    def can_generate(self) -> bool:
        """Check if user can generate more assets."""
        if self.tier == UserTier.PRO:
            return True
        return self.usage_count < self.usage_limit
