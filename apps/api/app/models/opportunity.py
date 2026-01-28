"""Opportunity model for content ideas."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.document import SourceType


class OpportunityStatus(str, PyEnum):
    """Opportunity status enum."""
    NEW = "new"
    USED = "used"
    DISMISSED = "dismissed"
    EXPIRED = "expired"


class Opportunity(Base):
    """Content opportunity identified from feeds."""

    __tablename__ = "opportunities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    angle: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_type: Mapped[SourceType | None] = mapped_column(
        Enum(SourceType),
        nullable=True,
    )
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[OpportunityStatus] = mapped_column(
        Enum(OpportunityStatus),
        default=OpportunityStatus.NEW,
        index=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    profile: Mapped["Profile"] = relationship("Profile", back_populates="opportunities")
    drafts: Mapped[list["Draft"]] = relationship("Draft", back_populates="opportunity")

    def __repr__(self) -> str:
        return f"<Opportunity {self.topic}>"
