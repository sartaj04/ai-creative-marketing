"""Identity graph and style profile models."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
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
    current_role: Mapped[str | None] = mapped_column(String, nullable=True)
    industry: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Professional details
    expertise_areas: Mapped[list] = mapped_column(JSONB, default=list, comment="Main areas of expertise")
    career_highlights: Mapped[list] = mapped_column(JSONB, default=list, comment="Key career achievements")
    career_stage: Mapped[str | None] = mapped_column(String, nullable=True)
    education: Mapped[list] = mapped_column(JSONB, default=list, comment="Education history")
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
    contrarian_views: Mapped[list] = mapped_column(JSONB, default=list, comment="Contrarian views (legacy field support)")
    
    # Content Strategy
    content_pillars: Mapped[list] = mapped_column(JSONB, default=list, comment="Derived content pillars")
    narrative_themes: Mapped[list] = mapped_column(JSONB, default=list, comment="Recurring story patterns")
    
    # Onboarding State
    onboarding_context: Mapped[dict] = mapped_column(JSONB, default=dict, comment="Transient state for onboarding conversation")

    
    # Legacy/Existing fields (kept for compatibility if needed, but redefined above where cleaner)
    themes: Mapped[list] = mapped_column(JSONB, default=list, comment="Main topics/themes the person talks about")
    expertise_keywords: Mapped[list] = mapped_column(JSONB, default=list, comment="Areas of expertise and skills")
    authority_angles: Mapped[list] = mapped_column(JSONB, default=list, comment="Credibility and authority markers")
    
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
