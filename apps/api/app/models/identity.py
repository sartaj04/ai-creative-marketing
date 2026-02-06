"""Identity graph and style profile models."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func, Text, Boolean, Enum
from enum import Enum as PyEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TimelineEventType(str, PyEnum):
    """Types of timeline events."""
    EDUCATION = "education"
    WORK = "work"
    USAGE = "usage"  # e.g. using a tool/tech
    ACHIEVEMENT = "achievement"
    FAILURE = "failure"
    LIFE_EVENT = "life_event"
    PIVOT = "pivot"
    OTHER = "other"


class TimelineEvent(Base):
    """Specific event on the user's timeline."""

    __tablename__ = "timeline_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    timeline_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("timelines.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Core Event Data
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type: Mapped[TimelineEventType] = mapped_column(
        Enum(TimelineEventType, name='timeline_event_type', create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=TimelineEventType.OTHER,
    )
    
    # Temporality
    start_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Narrative Depth
    emotional_core: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Why this matters/How it felt")
    lessons_learned: Mapped[list] = mapped_column(JSONB, default=list, comment="List of specific lessons")
    tags: Mapped[list] = mapped_column(JSONB, default=list, comment="Skills or themes involved")
    
    # Metadata
    source: Mapped[str | None] = mapped_column(String, nullable=True, comment="Where this came from (linkedin, chat)")
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
    timeline: Mapped["Timeline"] = relationship("Timeline", back_populates="events")

    def __repr__(self) -> str:
        return f"<TimelineEvent {self.title}>"


class Timeline(Base):
    """Container for the user's narrative timeline."""

    __tablename__ = "timelines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    identity_graph_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("identity_graphs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    
    # High-level Narrative
    primary_focus: Mapped[str | None] = mapped_column(Text, nullable=True, comment="What the user primarily wants to speak about")
    narrative_arc: Mapped[str | None] = mapped_column(Text, nullable=True, comment="LLM-synthesized story arc")
    
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
    identity_graph: Mapped["IdentityGraph"] = relationship("IdentityGraph", back_populates="timeline")
    events: Mapped[list["TimelineEvent"]] = relationship(
        "TimelineEvent",
        back_populates="timeline",
        cascade="all, delete-orphan",
        order_by="desc(TimelineEvent.start_date)",
    )

    def __repr__(self) -> str:
        return f"<Timeline for IG {self.identity_graph_id}>"

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
    current_role: Mapped[str | None] = mapped_column(String, nullable=True)
    industry: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Professional details
    expertise_areas: Mapped[list] = mapped_column(JSONB, default=list, comment="Main areas of expertise")
    career_highlights: Mapped[list] = mapped_column(JSONB, default=list, comment="Key career achievements")
    bio_summary: Mapped[str | None] = mapped_column(String, nullable=True, comment="Professional bio summary")
    
    # Brand Strategy
    target_audience: Mapped[str | None] = mapped_column(String, nullable=True)
    desired_positioning: Mapped[str | None] = mapped_column(String, nullable=True)
    unique_angles: Mapped[list] = mapped_column(JSONB, default=list, comment="Unique perspectives or angles")
    aspirations: Mapped[str | None] = mapped_column(String, nullable=True)
    goals: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Personality & Content
    interests: Mapped[list] = mapped_column(JSONB, default=list, comment="Personal interests/hobbies")
    beliefs: Mapped[list] = mapped_column(JSONB, default=list, comment="Core beliefs or contrarian views")

    # Deep Identity (auto-extracted from LinkedIn posts)
    stories: Mapped[list] = mapped_column(
        JSONB, default=list,
        comment="Concrete narrative episodes: [{title, narrative, tags, emotional_core, source_post_excerpt}]",
    )
    opinion_statements: Mapped[list] = mapped_column(
        JSONB, default=list,
        comment="Specific argued positions in full sentences, not labels",
    )
    interest_details: Mapped[dict] = mapped_column(
        JSONB, default=dict,
        comment="Qualified interest descriptions: {interest_key: specific_description}",
    )
    
    # Content Strategy
    content_pillars: Mapped[list] = mapped_column(JSONB, default=list, comment="Derived content pillars")
    narrative_themes: Mapped[list] = mapped_column(JSONB, default=list, comment="Recurring story patterns")
    
    # Onboarding State
    onboarding_context: Mapped[dict] = mapped_column(JSONB, default=dict, comment="Transient state for onboarding conversation")

    
    # Credibility markers (actively used in generation)
    authority_angles: Mapped[list] = mapped_column(JSONB, default=list, comment="Credibility and authority markers")

    completeness_score: Mapped[int] = mapped_column(Integer, default=0)

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
    timeline: Mapped["Timeline"] = relationship(
        "Timeline",
        back_populates="identity_graph",
        uselist=False,
        cascade="all, delete-orphan",
    )

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
    # Writing sample metadata
    writing_samples_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        comment="Number of user posts analyzed",
    )
    writing_sample_insights: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        comment="LLM-generated summary of user writing patterns",
    )
    detected_patterns: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Structured patterns extracted from writing samples",
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
