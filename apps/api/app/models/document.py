"""Extracted document model."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SourceType(str, PyEnum):
    """Source type enum."""
    LINKEDIN = "linkedin"
    WEBSITE = "website"
    RESUME = "resume"
    MANUAL = "manual"
    RSS = "rss"
    BLOG = "blog"
    USER_POST = "user_post"


class ExtractedDocument(Base):
    """Extracted and processed content from profile sources."""

    __tablename__ = "extracted_documents"

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
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name='source_type', create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # Vector embedding stored separately due to pgvector
    # content_embedding will be added via migration with pgvector
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    extracted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    profile: Mapped["Profile"] = relationship(
        "Profile",
        back_populates="extracted_documents",
    )

    def __repr__(self) -> str:
        return f"<ExtractedDocument {self.source_type} for profile {self.profile_id}>"
