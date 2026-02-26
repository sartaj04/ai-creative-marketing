"""Draft endpoints."""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession, get_profile_with_access, get_user_profile_ids
from app.models.draft import AgentType, Draft, DraftAction, DraftEvent, DraftStatus, Schedule
from app.models.draft_slide import DraftSlide
from app.models.profile import Profile
from app.models.template import TemplateUsage
from app.schemas.draft import (
    DraftActionRequest,
    DraftGenerateRequest,
    DraftListResponse,
    DraftResponse,
    DraftScheduleRequest,
    DraftStatusUpdate,
    ScheduleResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=DraftListResponse)
async def list_drafts(
    current_user: CurrentUser,
    db: DBSession,
    profile_id: Optional[UUID] = Query(None),
    status_filter: Optional[DraftStatus] = Query(None, alias="status"),
    generated_by: Optional[AgentType] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> DraftListResponse:
    """List drafts with optional filters."""
    # Get profile IDs the user has access to (via membership)
    user_profile_ids = await get_user_profile_ids(current_user, db)

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

    if generated_by:
        query = query.where(Draft.generated_by == generated_by)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.order_by(Draft.created_at.desc()).offset(offset).limit(limit)
    query = query.options(selectinload(Draft.media_assets), selectinload(Draft.slides))
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
        .options(selectinload(Draft.media_assets), selectinload(Draft.slides))
        .where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found",
        )

    # Verify access via membership
    await get_profile_with_access(draft.profile_id, current_user, db)

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
        .options(selectinload(Draft.profile), selectinload(Draft.media_assets))
        .where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found",
        )

    # Verify access via membership
    await get_profile_with_access(draft.profile_id, current_user, db)

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

    # Track feedback for persona learning (approve, reject, or edit actions)
    if action_data.action in [DraftAction.APPROVE, DraftAction.REJECT, DraftAction.EDIT]:
        profile = draft.profile
        profile.feedback_count_since_last_learn = (profile.feedback_count_since_last_learn or 0) + 1

        # Trigger learning when threshold reached
        if profile.feedback_count_since_last_learn >= 10:
            from app.tasks.persona_synthesizer import synthesize_persona_with_feedback_task
            synthesize_persona_with_feedback_task.delay(str(profile.id))
            # Counter will be reset by the task after successful learning

    await db.commit()
    await db.refresh(draft)
    await db.refresh(draft, attribute_names=['media_assets', 'slides'])

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
        select(Draft).where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found",
        )

    # Verify access via membership
    await get_profile_with_access(draft.profile_id, current_user, db)

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
        .options(selectinload(Draft.media_assets), selectinload(Draft.slides))
        .where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found",
        )

    # Verify access via membership
    await get_profile_with_access(draft.profile_id, current_user, db)

    draft.status = status_data.status

    await db.commit()
    await db.refresh(draft)
    await db.refresh(draft, attribute_names=['media_assets', 'slides'])

    return DraftResponse.model_validate(draft)


@router.post("/generate", response_model=DraftResponse, status_code=status.HTTP_201_CREATED)
async def generate_draft_from_template(
    request: DraftGenerateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> DraftResponse:
    """Generate a new Draft by filling a saved VisualTemplate with LLM-generated content.

    Mode 2 (deterministic):
    - Reads template HTML from DB (no layout generation, no vision analysis)
    - Calls LLM once to fill {{variable}} values for each slide
    - Renders via Playwright and uploads PNGs to S3
    - Persists Draft + DraftSlide + MediaAsset records

    For carousel templates, the template must have SlideTemplate records (created
    when an admin approved and saved the template via POST /visual-templates).
    """
    # Verify the requesting user has access to the profile
    await get_profile_with_access(request.profile_id, current_user, db)

    from app.services.draft_generation_service import DraftGenerationService

    service = DraftGenerationService(db=db)

    try:
        draft = await service.run(
            template_id=request.template_id,
            profile_id=request.profile_id,
            brand_context=request.brand_context,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Draft generation from template failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Draft generation failed: {str(e)}",
        )

    return DraftResponse.model_validate(draft)
