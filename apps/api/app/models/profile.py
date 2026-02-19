"""Profile and ProfileSource models."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProfileType(str, PyEnum):
    """Profile type enum."""
    INDIVIDUAL = "individual"
    ENTERPRISE = "enterprise"


class Profile(Base):
    """Brand profile model."""

    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[ProfileType] = mapped_column(
        Enum(ProfileType, name='profile_type', create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ProfileType.INDIVIDUAL,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location: Mapped[list] = mapped_column(
        JSONB,
        default=list,
        comment="Target markets or physical locations (e.g. ['New York', 'London'])",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Cached persona prompt (synthesized from identity + style)
    persona_prompt: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Pre-synthesized natural language prompt from identity+style",
    )
    persona_prompt_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="When persona prompt was last synthesized",
    )

    # Learned preferences from feedback (updated incrementally)
    learned_preferences: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Summary of learned content preferences from user feedback",
    )
    learned_preferences_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="When learned preferences were last updated",
    )
    feedback_count_since_last_learn: Mapped[int] = mapped_column(
        Integer,
        default=0,
        comment="Number of feedback events since last learning run",
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profiles")
    sources: Mapped["ProfileSource"] = relationship(
        "ProfileSource",
        back_populates="profile",
        uselist=False,
        cascade="all, delete-orphan",
    )
    identity_graph: Mapped["IdentityGraph"] = relationship(
        "IdentityGraph",
        back_populates="profile",
        uselist=False,
        cascade="all, delete-orphan",
    )
    style_profile: Mapped["StyleProfile"] = relationship(
        "StyleProfile",
        back_populates="profile",
        uselist=False,
        cascade="all, delete-orphan",
    )
    extracted_documents: Mapped[list["ExtractedDocument"]] = relationship(
        "ExtractedDocument",
        back_populates="profile",
        cascade="all, delete-orphan",
    )
    opportunities: Mapped[list["Opportunity"]] = relationship(
        "Opportunity",
        back_populates="profile",
        cascade="all, delete-orphan",
    )
    drafts: Mapped[list["Draft"]] = relationship(
        "Draft",
        back_populates="profile",
        cascade="all, delete-orphan",
    )
    agent_runs: Mapped[list["AgentRun"]] = relationship(
        "AgentRun",
        back_populates="profile",
        cascade="all, delete-orphan",
    )
    members: Mapped[list["ProfileMember"]] = relationship(
        "ProfileMember",
        back_populates="profile",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Profile {self.name}>"


class ProfileSource(Base):
    """Profile sources model."""

    __tablename__ = "profile_sources"

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
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resume_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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
    profile: Mapped["Profile"] = relationship("Profile", back_populates="sources")

    def __repr__(self) -> str:
        return f"<ProfileSource for profile {self.profile_id}>"
