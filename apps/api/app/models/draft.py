"""Draft and related models."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DraftStatus(str, PyEnum):
    """Draft status enum."""
    INBOX = "inbox"
    APPROVED = "approved"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    REJECTED = "rejected"


class DraftFormat(str, PyEnum):
    """Draft format enum."""
    POST = "post"
    THREAD = "thread"
    CAROUSEL = "carousel"
    ARTICLE = "article"


class DraftAction(str, PyEnum):
    """Draft action enum for events."""
    APPROVE = "approve"
    REJECT = "reject"
    EDIT = "edit"
    SCHEDULE = "schedule"
    PUBLISH = "publish"


class PlatformType(str, PyEnum):
    """Platform type enum."""
    LINKEDIN = "linkedin"
    TWITTER = "twitter"


class AgentType(str, PyEnum):
    """Agent type enum."""
    STYLE_LEARNER = "style_learner"
    OPPORTUNITY_SCOUT = "opportunity_scout"
    DRAFT_GENERATOR = "draft_generator"
    FEEDBACK_LOOP = "feedback_loop"
    REPURPOSING = "repurposing"
    ANALYTICS_DIGEST = "analytics_digest"
    CONTENT_AGENCY = "content_agency"


class Draft(Base):
    """Generated content draft."""

    __tablename__ = "drafts"

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
    opportunity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="SET NULL"),
        nullable=True,
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[DraftStatus] = mapped_column(
        Enum(DraftStatus, name='draft_status', create_type=False, values_callable=lambda x: [e.value for e in x]),
        default=DraftStatus.INBOX,
        index=True,
    )
    format: Mapped[DraftFormat] = mapped_column(
        Enum(DraftFormat, name='draft_format', create_type=False),
        default=DraftFormat.POST,
    )
    hook: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    sources_json: Mapped[list] = mapped_column(JSONB, default=list)
    generated_by: Mapped[AgentType | None] = mapped_column(
        Enum(AgentType, name='agent_type', create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    platform: Mapped[PlatformType | None] = mapped_column(
        Enum(PlatformType, name='platform_type', create_type=False),
        nullable=True,
    )
    external_post_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    engagement_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    # Style metadata for uniqueness tracking across sessions
    hook_style: Mapped[str | None] = mapped_column(String(50), nullable=True)
    format_archetype: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cta_style: Mapped[str | None] = mapped_column(String(50), nullable=True)
    hashtags: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Diversity dimensions for content variety enforcement
    content_mode: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="Content mode: builder, learner, narrator, observer, explainer, skeptic, advisor",
    )
    authority_posture: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="Authority posture: curious, uncertain, peer_level, experienced, reflective, decisive",
    )
    emotional_tone: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="Emotional tone: excited, frustrated, contemplative, amused, vulnerable, matter_of_fact",
    )
    identity_facets_used: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True,
        comment="Which identity facets were sampled for this draft",
    )
    topic_domain: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="Topic domain: technical, personal, industry, philosophical, creative, professional",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    profile: Mapped["Profile"] = relationship("Profile", back_populates="drafts")
    opportunity: Mapped["Opportunity"] = relationship(
        "Opportunity",
        back_populates="drafts",
    )
    template: Mapped["Template"] = relationship("Template", back_populates="drafts")
    events: Mapped[list["DraftEvent"]] = relationship(
        "DraftEvent",
        back_populates="draft",
        cascade="all, delete-orphan",
    )
    schedules: Mapped[list["Schedule"]] = relationship(
        "Schedule",
        back_populates="draft",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Draft {self.id} - {self.status}>"


class DraftEvent(Base):
    """Audit trail for draft actions."""

    __tablename__ = "draft_events"

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
    action: Mapped[DraftAction] = mapped_column(
        Enum(DraftAction, name='draft_action', create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    previous_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    draft: Mapped["Draft"] = relationship("Draft", back_populates="events")

    def __repr__(self) -> str:
        return f"<DraftEvent {self.action} for draft {self.draft_id}>"


class Schedule(Base):
    """Publishing schedule for drafts."""

    __tablename__ = "schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    draft_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drafts.id", ondelete="CASCADE"),
        nullable=False,
    )
    scheduled_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    platform: Mapped[PlatformType] = mapped_column(
        Enum(PlatformType, name='platform_type', create_type=False),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        index=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    draft: Mapped["Draft"] = relationship("Draft", back_populates="schedules")

    def __repr__(self) -> str:
        return f"<Schedule {self.scheduled_time} for draft {self.draft_id}>"
