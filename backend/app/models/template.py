"""
Template model for storing HTML/CSS ad templates.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, TYPE_CHECKING

from sqlalchemy import String, DateTime, Text, Boolean, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.user import UserSegment

if TYPE_CHECKING:
    from app.models.generated_asset import GeneratedAsset


class Template(Base):
    """HTML/CSS template for generating ad creatives."""
    
    __tablename__ = "templates"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="general"
    )
    # Segment this template is designed for
    segment: Mapped[Optional[UserSegment]] = mapped_column(
        String(50),
        nullable=True
    )
    
    # Template code
    html_code: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    css_code: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=""
    )
    
    # Preview
    thumbnail_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    
    # Supported aspect ratios: ["1:1", "9:16", "1.91:1", "4:5", "16:9"]
    aspect_ratios: Mapped[List[str]] = mapped_column(
        JSONB,
        default=list,
        nullable=False
    )
    
    # Template variables that can be customized
    # [{name: "headline", type: "text", required: true}, ...]
    variables: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSONB,
        default=list,
        nullable=False
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    is_premium: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Usage stats
    usage_count: Mapped[int] = mapped_column(
        default=0,
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
    generated_assets: Mapped[List["GeneratedAsset"]] = relationship(
        "GeneratedAsset",
        back_populates="template"
    )
