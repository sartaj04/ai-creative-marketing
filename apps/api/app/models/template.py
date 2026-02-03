"""Template and TemplateUsage models."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.draft import DraftFormat, PlatformType


class TemplateCategory(str, PyEnum):
    """Template category enum."""
    MYTH_BUSTER = "myth_buster"
    TIPS = "tips"
    STORY = "story"
    FRAMEWORK = "framework"
    CONTRARIAN = "contrarian"
    LESSONS = "lessons"
    LISTICLE = "listicle"
    QUESTION = "question"
    COMPARISON = "comparison"
    ANNOUNCEMENT = "announcement"
    CASE_STUDY = "case_study"


class ContributionStatus(str, PyEnum):
    """Status for user template contributions."""
    NONE = "none"  # User hasn't offered to contribute
    PENDING = "pending"  # User submitted for contribution, awaiting review
    APPROVED = "approved"  # Admin approved, template is public
    REJECTED = "rejected"  # Admin rejected contribution


class Template(Base):
    """Content template with metadata."""

    __tablename__ = "templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Template content with {placeholders}",
    )
    format: Mapped[DraftFormat] = mapped_column(
        Enum(DraftFormat, name='draft_format', create_type=False),
        default=DraftFormat.POST,
    )
    category: Mapped[TemplateCategory] = mapped_column(
        Enum(TemplateCategory, name='template_category', create_type=False),
        nullable=False,
    )
    tags: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="Searchable tags",
    )
    variables: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        comment="Extracted {variable} metadata",
    )
    use_cases: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="When to use this template",
    )
    tone_fit: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="Which tones this template works with",
    )
    platform: Mapped[str] = mapped_column(
        String(50),
        default="both",
        comment="linkedin, twitter, or both",
    )
    # Future-proofing for visual content
    image_template: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Figma/SVG template reference for images",
    )
    carousel_slides: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Array of slide templates for carousels",
    )
    media_placeholders: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Image/video slots in template",
    )
    # Length control
    length_flexibility: Mapped[str] = mapped_column(
        String(50),
        default="flexible",
        comment="fixed, semi_flexible, or flexible",
    )
    min_length: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Minimum word count (if fixed/semi_flexible)",
    )
    max_length: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Maximum word count (if fixed/semi_flexible)",
    )
    # Template ownership and visibility
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        comment="True for admin-created system templates visible to all",
    )
    is_contributed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        comment="True if user wants to share template with platform",
    )
    contribution_status: Mapped[ContributionStatus] = mapped_column(
        Enum(ContributionStatus, name='contributionstatus', create_type=False),
        default=ContributionStatus.NONE,
        comment="Moderation status for contributed templates",
    )
    # Metadata
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    drafts: Mapped[list["Draft"]] = relationship("Draft", back_populates="template")
    usages: Mapped[list["TemplateUsage"]] = relationship(
        "TemplateUsage",
        back_populates="template",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Template {self.name}>"


class TemplateUsage(Base):
    """Track template usage and performance."""

    __tablename__ = "template_usages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    draft_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drafts.id", ondelete="CASCADE"),
        nullable=False,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    was_approved: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    template: Mapped["Template"] = relationship("Template", back_populates="usages")

    def __repr__(self) -> str:
        return f"<TemplateUsage template={self.template_id} draft={self.draft_id}>"
