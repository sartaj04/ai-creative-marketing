"""
Template model for storing HTML/CSS ad templates.
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any, TYPE_CHECKING

from sqlalchemy import String, DateTime, Text, Boolean, Integer, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.user import UserSegment

if TYPE_CHECKING:
    from app.models.generated_asset import GeneratedAsset
    from app.models.user import User


class TemplateStatus(str, Enum):
    """Template lifecycle status."""
    DRAFT = "draft"
    APPROVED = "approved"
    DEPRECATED = "deprecated"


class FormatType(str, Enum):
    """Template format types."""
    STATIC = "static"
    MOTION = "motion"
    VIDEO = "video"


class TemplateIndustry(str, Enum):
    """Industry categories for templates."""
    ECOMMERCE = "ecommerce"
    SAAS = "saas"
    LOCAL = "local"
    PERSONAL = "personal"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    REALESTATE = "realestate"
    FOOD = "food"
    GENERAL = "general"


class TemplatePlatform(str, Enum):
    """Target platforms for templates."""
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    META_ADS = "meta_ads"
    GOOGLE_ADS = "google_ads"
    GENERAL = "general"


class TemplateObjective(str, Enum):
    """Marketing objectives for templates."""
    CONVERSION = "conversion"
    AWARENESS = "awareness"
    TESTIMONIAL = "testimonial"
    PROMOTION = "promotion"
    ENGAGEMENT = "engagement"
    ANNOUNCEMENT = "announcement"
    GENERAL = "general"


class TemplateType(str, Enum):
    """Template content types."""
    POST = "post"           # Single image post
    CAROUSEL = "carousel"   # Multi-slide carousel
    TEXT = "text"           # Text-only template


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
    
    # === ADMIN CLASSIFICATION FIELDS ===
    
    # Template lifecycle status (admin-controlled)
    status: Mapped[TemplateStatus] = mapped_column(
        String(50),
        default=TemplateStatus.DRAFT,
        nullable=False
    )
    
    # Industry targeting
    industry: Mapped[TemplateIndustry] = mapped_column(
        String(50),
        default=TemplateIndustry.GENERAL,
        nullable=False
    )
    
    # Platform targeting
    platform: Mapped[TemplatePlatform] = mapped_column(
        String(50),
        default=TemplatePlatform.GENERAL,
        nullable=False
    )
    
    # Marketing objective
    objective: Mapped[TemplateObjective] = mapped_column(
        String(50),
        default=TemplateObjective.GENERAL,
        nullable=False
    )
    
    # Format type (static, motion, video)
    format_type: Mapped[FormatType] = mapped_column(
        String(50),
        default=FormatType.STATIC,
        nullable=False
    )
    
    # Template content type (post, carousel, text)
    template_type: Mapped[TemplateType] = mapped_column(
        String(50),
        default=TemplateType.POST,
        nullable=False
    )
    
    # Number of slides (for carousels)
    slide_count: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False
    )
    
    # === EXTRACTED METADATA ===
    
    # Colors extracted from source image
    extracted_colors: Mapped[List[str]] = mapped_column(
        JSONB,
        default=list,
        nullable=False
    )
    
    # Fonts detected in source image
    extracted_fonts: Mapped[List[str]] = mapped_column(
        JSONB,
        default=list,
        nullable=False
    )
    
    # URL to original uploaded source file (PDF/image)
    source_file_url: Mapped[Optional[str]] = mapped_column(
        String(500),
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
    
    # === SCHEMA DEFINITIONS (JSONB) ===
    
    # Layout schema - zone definitions, percentages, constraints
    # Example: {"zones": [{"id": "headline", "type": "text", "required": true, ...}]}
    layout_schema: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Slides schema - for carousel templates (array of layout schemas, one per slide)
    # Example: [{"type": "div", ...}, {"type": "div", ...}]
    slides_schema: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Motion schema - for motion/video templates
    # Example: {"scenes": [...], "transitions": [...], "timing": {...}}
    motion_schema: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True
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
    
    # === VERSIONING ===
    
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False
    )
    
    # === ADMIN TRACKING ===
    
    # Admin who created the template
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Admin who approved the template
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # === QA TRACKING ===
    
    # Whether dummy render QA passed
    dummy_render_passed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # URL to the dummy render image (for review)
    dummy_render_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    
    # === STATUS FLAGS ===
    
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
    
    # Admin relationships
    creator: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[created_by],
        lazy="selectin"
    )
    approver: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[approved_by],
        lazy="selectin"
    )

