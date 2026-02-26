"""Media asset model for images and carousel slides."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MediaAssetType(str, PyEnum):
    """Media asset type enum."""
    IMAGE = "image"
    CAROUSEL_SLIDE = "carousel_slide"
    COVER_IMAGE = "cover_image"


class MediaAsset(Base):
    """Media asset (image, carousel slide, cover) attached to a draft."""

    __tablename__ = "media_assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    draft_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drafts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[MediaAssetType] = mapped_column(
        Enum(MediaAssetType, name="media_asset_type", create_type=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    storage_url: Mapped[str] = mapped_column(
        String(1024),
        nullable=False,
        comment="Public URL of the stored image",
    )
    storage_key: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        comment="S3 bucket key for lifecycle management",
    )
    alt_text: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="Accessibility text / SEO description",
    )
    slide_index: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Position for carousel slides (0-indexed)",
    )
    visual_template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visual_templates.id", ondelete="SET NULL"),
        nullable=True,
        comment="Template used to render this image, if any",
    )
    generation_prompt: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Prompt used for AI image generation",
    )
    metadata_json: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        comment="Width, height, format, file_size, etc.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    draft: Mapped["Draft"] = relationship("Draft", back_populates="media_assets")
    visual_template: Mapped["VisualTemplate"] = relationship(
        "VisualTemplate", back_populates="rendered_assets",
    )

    def __repr__(self) -> str:
        return f"<MediaAsset {self.id} type={self.type} draft={self.draft_id}>"
