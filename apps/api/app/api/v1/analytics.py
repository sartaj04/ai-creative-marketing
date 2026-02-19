"""Analytics endpoints."""
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import case, func, select

from app.api.deps import CurrentUser, DBSession, get_profile_with_access
from app.models.draft import Draft, DraftAction, DraftEvent, DraftStatus
from app.models.profile import Profile
from app.schemas.analytics import (
    AnalyticsSummary,
    FormatAnalytics,
    FormatMetric,
    TopicAnalytics,
    TopicMetric,
)

router = APIRouter()


def get_period_dates(period: str) -> tuple[datetime, datetime]:
    """Get start and end dates for a period."""
    now = datetime.now(timezone.utc)
    if period == "7d":
        start = now - timedelta(days=7)
    elif period == "90d":
        start = now - timedelta(days=90)
    else:  # Default 30d
        start = now - timedelta(days=30)
    return start, now


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    current_user: CurrentUser,
    db: DBSession,
    profile_id: UUID = Query(...),
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
) -> AnalyticsSummary:
    """Get analytics summary for a profile."""
    await get_profile_with_access(profile_id, current_user, db)

    period_start, period_end = get_period_dates(period)

    # Get draft counts by status
    draft_stats = await db.execute(
        select(
            func.count(Draft.id).label("total"),
            func.sum(case((Draft.status == DraftStatus.APPROVED, 1), else_=0)).label("approved"),
            func.sum(case((Draft.status == DraftStatus.REJECTED, 1), else_=0)).label("rejected"),
            func.sum(case((Draft.status == DraftStatus.PUBLISHED, 1), else_=0)).label("published"),
            func.avg(Draft.confidence).label("avg_confidence"),
        ).where(
            Draft.profile_id == profile_id,
            Draft.created_at >= period_start,
            Draft.created_at <= period_end,
        )
    )
    stats = draft_stats.first()

    total = stats.total or 0
    approved = stats.approved or 0
    rejected = stats.rejected or 0
    published = stats.published or 0
    avg_confidence = float(stats.avg_confidence) if stats.avg_confidence else 0.0

    # Calculate approval rate (approved / (approved + rejected))
    decisions = approved + rejected
    approval_rate = approved / decisions if decisions > 0 else 0.0

    return AnalyticsSummary(
        total_drafts_generated=total,
        drafts_approved=approved,
        drafts_rejected=rejected,
        drafts_published=published,
        approval_rate=approval_rate,
        avg_confidence=avg_confidence,
        period=period,
        period_start=period_start,
        period_end=period_end,
    )


@router.get("/topics", response_model=TopicAnalytics)
async def get_topic_analytics(
    current_user: CurrentUser,
    db: DBSession,
    profile_id: UUID = Query(...),
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
) -> TopicAnalytics:
    """Get topic performance analytics."""
    await get_profile_with_access(profile_id, current_user, db)

    period_start, period_end = get_period_dates(period)

    # Get topic stats
    topic_stats = await db.execute(
        select(
            Draft.topic,
            func.count(Draft.id).label("count"),
            func.sum(case((Draft.status == DraftStatus.APPROVED, 1), else_=0)).label("approved"),
            func.sum(case((Draft.status == DraftStatus.REJECTED, 1), else_=0)).label("rejected"),
        )
        .where(
            Draft.profile_id == profile_id,
            Draft.created_at >= period_start,
            Draft.created_at <= period_end,
            Draft.topic.isnot(None),
        )
        .group_by(Draft.topic)
        .order_by(func.count(Draft.id).desc())
        .limit(10)
    )

    topics = []
    for row in topic_stats:
        total_decisions = (row.approved or 0) + (row.rejected or 0)
        approval_rate = (row.approved or 0) / total_decisions if total_decisions > 0 else 0.0
        topics.append(
            TopicMetric(
                topic=row.topic,
                count=row.count,
                approval_rate=approval_rate,
            )
        )

    return TopicAnalytics(topics=topics, period=period)


@router.get("/formats", response_model=FormatAnalytics)
async def get_format_analytics(
    current_user: CurrentUser,
    db: DBSession,
    profile_id: UUID = Query(...),
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
) -> FormatAnalytics:
    """Get format performance analytics."""
    await get_profile_with_access(profile_id, current_user, db)

    period_start, period_end = get_period_dates(period)

    # Get format stats
    format_stats = await db.execute(
        select(
            Draft.format,
            func.count(Draft.id).label("count"),
            func.sum(case((Draft.status == DraftStatus.APPROVED, 1), else_=0)).label("approved"),
            func.sum(case((Draft.status == DraftStatus.REJECTED, 1), else_=0)).label("rejected"),
        )
        .where(
            Draft.profile_id == profile_id,
            Draft.created_at >= period_start,
            Draft.created_at <= period_end,
        )
        .group_by(Draft.format)
        .order_by(func.count(Draft.id).desc())
    )

    formats = []
    for row in format_stats:
        total_decisions = (row.approved or 0) + (row.rejected or 0)
        approval_rate = (row.approved or 0) / total_decisions if total_decisions > 0 else 0.0
        formats.append(
            FormatMetric(
                format=row.format.value,
                count=row.count,
                approval_rate=approval_rate,
            )
        )

    return FormatAnalytics(formats=formats, period=period)
