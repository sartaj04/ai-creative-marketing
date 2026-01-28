"""Draft endpoints."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.draft import Draft, DraftAction, DraftEvent, DraftStatus, Schedule
from app.models.profile import Profile
from app.models.template import TemplateUsage
from app.schemas.draft import (
    DraftActionRequest,
    DraftListResponse,
    DraftResponse,
    DraftScheduleRequest,
    DraftStatusUpdate,
    ScheduleResponse,
)

router = APIRouter()


@router.get("", response_model=DraftListResponse)
async def list_drafts(
    current_user: CurrentUser,
    db: DBSession,
    profile_id: Optional[UUID] = Query(None),
    status_filter: Optional[DraftStatus] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> DraftListResponse:
    """List drafts with optional filters."""
    # Get user's profile IDs
    profile_result = await db.execute(
        select(Profile.id).where(Profile.user_id == current_user.id)
    )
    user_profile_ids = [p for p in profile_result.scalars().all()]

    if not user_profile_ids:
        return DraftListResponse(drafts=[], total=0, limit=limit, offset=offset)

    # Build query
    query = select(Draft).where(Draft.profile_id.in_(user_profile_ids))

    if profile_id:
        if profile_id not in user_profile_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this profile",
            )
        query = query.where(Draft.profile_id == profile_id)

    if status_filter:
        query = query.where(Draft.status == status_filter)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.order_by(Draft.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    drafts = result.scalars().all()

    return DraftListResponse(
        drafts=[DraftResponse.model_validate(d) for d in drafts],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{draft_id}", response_model=DraftResponse)
async def get_draft(
    draft_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> DraftResponse:
    """Get a specific draft."""
    result = await db.execute(
        select(Draft)
        .options(selectinload(Draft.profile))
        .where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found",
        )

    # Verify ownership
    if draft.profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return DraftResponse.model_validate(draft)


@router.post("/{draft_id}/action", response_model=DraftResponse)
async def perform_draft_action(
    draft_id: UUID,
    action_data: DraftActionRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> DraftResponse:
    """Perform action on draft (approve, reject, edit)."""
    result = await db.execute(
        select(Draft)
        .options(selectinload(Draft.profile))
        .where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found",
        )

    if draft.profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Store previous state for edit tracking
    previous_state = None
    if action_data.action == DraftAction.EDIT:
        previous_state = {
            "hook": draft.hook,
            "body": draft.body,
        }

    # Update draft based on action
    if action_data.action == DraftAction.APPROVE:
        draft.status = DraftStatus.APPROVED
    elif action_data.action == DraftAction.REJECT:
        draft.status = DraftStatus.REJECTED
    elif action_data.action == DraftAction.EDIT:
        if action_data.edited_hook:
            draft.hook = action_data.edited_hook
        if action_data.edited_body:
            draft.body = action_data.edited_body
        draft.status = DraftStatus.APPROVED

    # Create event
    event = DraftEvent(
        draft_id=draft.id,
        action=action_data.action,
        feedback=action_data.feedback,
        previous_state=previous_state,
    )
    db.add(event)

    # Update template usage if applicable
    if draft.template_id:
        usage = TemplateUsage(
            template_id=draft.template_id,
            draft_id=draft.id,
            profile_id=draft.profile_id,
            was_approved=action_data.action in [DraftAction.APPROVE, DraftAction.EDIT],
            feedback=action_data.feedback,
        )
        db.add(usage)

    await db.commit()
    await db.refresh(draft)

    return DraftResponse.model_validate(draft)


@router.put("/{draft_id}/schedule", response_model=ScheduleResponse)
async def schedule_draft(
    draft_id: UUID,
    schedule_data: DraftScheduleRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> ScheduleResponse:
    """Schedule a draft for publishing."""
    result = await db.execute(
        select(Draft)
        .options(selectinload(Draft.profile))
        .where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found",
        )

    if draft.profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if draft.status not in [DraftStatus.APPROVED, DraftStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Draft must be approved before scheduling",
        )

    # Create schedule
    schedule = Schedule(
        draft_id=draft.id,
        scheduled_time=schedule_data.scheduled_time,
        platform=schedule_data.platform,
    )
    db.add(schedule)

    # Update draft
    draft.status = DraftStatus.SCHEDULED
    draft.scheduled_at = schedule_data.scheduled_time
    draft.platform = schedule_data.platform

    # Create event
    event = DraftEvent(
        draft_id=draft.id,
        action=DraftAction.SCHEDULE,
    )
    db.add(event)

    await db.commit()
    await db.refresh(schedule)

    return ScheduleResponse.model_validate(schedule)


@router.put("/{draft_id}/status", response_model=DraftResponse)
async def update_draft_status(
    draft_id: UUID,
    status_data: DraftStatusUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> DraftResponse:
    """Update draft status."""
    result = await db.execute(
        select(Draft)
        .options(selectinload(Draft.profile))
        .where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found",
        )

    if draft.profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    draft.status = status_data.status

    await db.commit()
    await db.refresh(draft)

    return DraftResponse.model_validate(draft)
