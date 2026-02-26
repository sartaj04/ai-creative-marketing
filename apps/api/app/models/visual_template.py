"""Visual template model for image and carousel templates."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VisualTemplateType(str, PyEnum):
    """Visual template type enum."""
    IMAGE = "image"
    CAROUSEL = "carousel"


class VisualTemplate(Base):
    """Predefined or user-created visual template for images and carousels.

    Templates can be either:
    - HTML/CSS based (system templates, rendered via Playwright)
    - Fabric.js JSON based (user-created via drag-and-drop builder)
    """

    __tablename__ = "visual_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Display name, e.g. 'Bold Quote Card'",
    )
    type: Mapped[VisualTemplateType] = mapped_column(
        Enum(VisualTemplateType, name="visual_template_type", create_type=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="quote, stat, tips, story, listicle, announcement, comparison, checklist",
    )
    preview_url: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
        comment="S3 URL of rendered preview thumbnail",
    )
    # Two rendering sources — exactly one should be populated
    html_template: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Full HTML/CSS template with {{variable}} slots (system templates)",
    )
    canvas_json: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Fabric.js serialized canvas JSON (user-built templates)",
    )
    variables_schema: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        comment="Schema defining editable fields: {name: {type, maxLength, required, default, ...}}",
    )
    slide_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Number of slides for carousel templates (None for image templates)",
    )
    slides_schema: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Per-slide templates and variable schemas for carousel templates",
    )
    default_values: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        comment="Pre-filled example values for template preview",
    )
    tags: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="Searchable tags: ['professional', 'bold', 'dark-mode']",
    )
    platform: Mapped[str] = mapped_column(
        String(50),
        default="both",
        comment="linkedin, twitter, or both",
    )
    dimensions: Mapped[dict] = mapped_column(
        JSONB,
        default=lambda: {"width": 1080, "height": 1080},
        comment="Canvas dimensions: {width, height}",
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        comment="True = Pixo-provided system template",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who created a custom template (None for system templates)",
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
    rendered_assets: Mapped[list["MediaAsset"]] = relationship(
        "MediaAsset",
        back_populates="visual_template",
    )
    slides: Mapped[list["SlideTemplate"]] = relationship(
        "SlideTemplate",
        back_populates="visual_template",
        cascade="all, delete-orphan",
        order_by="SlideTemplate.order",
    )

    def __repr__(self) -> str:
        return f"<VisualTemplate {self.name} type={self.type}>"
