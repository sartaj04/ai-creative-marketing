"""SlideTemplate model — one HTML slide within a carousel VisualTemplate."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SlideTemplate(Base):
    """A single slide's HTML/CSS structure within a carousel visual template.

    Each carousel VisualTemplate has N SlideTemplate records (one per slide),
    each carrying its own html_structure and variable_schema.
    Populated when an admin approves and saves a carousel template.
    """

    __tablename__ = "slide_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    visual_template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visual_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    html_structure: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Full HTML/CSS with {{variable}} slots for this slide",
    )
    variable_schema: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        comment="Schema: {var_name: {type, maxLength, required, description}}",
    )
    default_values: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        comment="Example variable values for preview rendering",
    )
    order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="1-indexed slide position within the carousel",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    visual_template: Mapped["VisualTemplate"] = relationship(
        "VisualTemplate",
        back_populates="slides",
    )
    draft_slides: Mapped[list["DraftSlide"]] = relationship(
        "DraftSlide",
        back_populates="slide_template",
    )

    def __repr__(self) -> str:
        return (
            f"<SlideTemplate order={self.order} "
            f"template={self.visual_template_id}>"
        )
