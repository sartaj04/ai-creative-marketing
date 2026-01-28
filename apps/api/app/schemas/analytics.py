"""Analytics schemas."""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class AnalyticsSummary(BaseModel):
    """Schema for analytics summary."""

    total_drafts_generated: int = 0
    drafts_approved: int = 0
    drafts_rejected: int = 0
    drafts_published: int = 0
    approval_rate: float = 0.0
    avg_confidence: float = 0.0
    period: str = "30d"
    period_start: datetime
    period_end: datetime


class TopicMetric(BaseModel):
    """Schema for topic metrics."""

    topic: str
    count: int
    approval_rate: float


class TopicAnalytics(BaseModel):
    """Schema for topic analytics."""

    topics: list[TopicMetric] = Field(default_factory=list)
    period: str = "30d"


class FormatMetric(BaseModel):
    """Schema for format metrics."""

    format: str
    count: int
    approval_rate: float


class FormatAnalytics(BaseModel):
    """Schema for format analytics."""

    formats: list[FormatMetric] = Field(default_factory=list)
    period: str = "30d"


class AgentSuggestion(BaseModel):
    """Schema for agent tuning suggestion."""

    suggestion_type: str
    description: str
    impact: str
    action: Optional[str] = None


class WeeklyDigest(BaseModel):
    """Schema for weekly analytics digest."""

    summary: AnalyticsSummary
    top_topics: list[TopicMetric] = Field(default_factory=list)
    top_formats: list[FormatMetric] = Field(default_factory=list)
    suggestions: list[AgentSuggestion] = Field(default_factory=list)
    generated_at: datetime
