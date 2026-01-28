"""Identity graph and style profile models."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class IdentityGraph(Base):
    """Unified identity graph model."""

    __tablename__ = "identity_graphs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    # Core identity components
    themes: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="Main topics/themes the person talks about",
    )
    expertise_keywords: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="Areas of expertise and skills",
    )
    tone_markers: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        comment="Tone characteristics with weights",
    )
    audience_notes: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        comment="Target audience information",
    )
    authority_angles: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="Credibility and authority markers",
    )
    narrative_themes: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="Recurring story patterns",
    )
    # Metadata
    version: Mapped[int] = mapped_column(Integer, default=1)
    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    profile: Mapped["Profile"] = relationship("Profile", back_populates="identity_graph")

    def __repr__(self) -> str:
        return f"<IdentityGraph for profile {self.profile_id}>"


class StyleProfile(Base):
    """Style profile model for content generation preferences."""

    __tablename__ = "style_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    # Style preferences
    tone_sliders: Mapped[dict] = mapped_column(
        JSONB,
        default=lambda: {
            "formal_casual": 0.5,
            "technical_simple": 0.5,
            "serious_playful": 0.5,
            "humble_confident": 0.5,
        },
        comment="Tone preference sliders (0-1 scale)",
    )
    format_preferences: Mapped[dict] = mapped_column(
        JSONB,
        default=lambda: {
            "post": 0.5,
            "thread": 0.3,
            "carousel": 0.2,
        },
        comment="Content format preferences with weights",
    )
    taboo_list: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="Topics/claims to avoid",
    )
    preferred_hooks: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="Preferred hook styles",
    )
    # Learned weights from feedback
    weights: Mapped[dict] = mapped_column(
        JSONB,
        default=lambda: {
            "topic_weight": {},
            "format_weight": {},
            "hook_weight": {},
        },
        comment="Learned weights from user feedback",
    )
    # Metadata
    version: Mapped[int] = mapped_column(Integer, default=1)
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
    profile: Mapped["Profile"] = relationship("Profile", back_populates="style_profile")

    def __repr__(self) -> str:
        return f"<StyleProfile for profile {self.profile_id}>"
