"""DraftSlide model — a rendered slide within a template-generated draft."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DraftSlide(Base):
    """A single rendered slide within a Draft.

    Created when draft_generation_service generates a draft from a carousel
    VisualTemplate. Stores the rendered HTML (variables already substituted),
    the filled variable values (for audit / re-render), the source SlideTemplate
    (nullable FK for audit safety), and the slide position.
    """

    __tablename__ = "draft_slides"

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
    slide_template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("slide_templates.id", ondelete="SET NULL"),
        nullable=True,
        comment="Source slide template. SET NULL if template deleted (preserves draft history).",
    )
    rendered_html: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Final HTML with all {{variables}} already substituted",
    )
    filled_variables: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        comment="{variable_name: value} — audit trail and re-render source",
    )
    order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="0-indexed slide position within the draft",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    draft: Mapped["Draft"] = relationship("Draft", back_populates="slides")
    slide_template: Mapped["SlideTemplate | None"] = relationship(
        "SlideTemplate",
        back_populates="draft_slides",
    )

    def __repr__(self) -> str:
        return f"<DraftSlide order={self.order} draft={self.draft_id}>"
