"""Template endpoints."""
import re
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select, or_

from app.api.deps import CurrentUser, DBSession, AdminUser
from app.models.draft import DraftFormat
from app.models.template import Template, TemplateCategory, TemplateUsage, ContributionStatus
from app.schemas.template import (
    TemplateCreate,
    TemplateListResponse,
    TemplateMatchRequest,
    TemplateMatchResponse,
    TemplateResponse,
    TemplateUpdate,
    SystemTemplateCreate,
    SystemTemplateAnalyzeRequest,
    SystemTemplateAnalyzeResponse,
    TemplateContributeRequest,
    TemplateContributeResponse,
    ContributionReviewRequest,
)
from app.templates.analyzer import analyze_and_enrich_template, extract_variables

router = APIRouter()


def _extract_variables(content: str) -> dict:
    """Extract {variable} placeholders from template content."""
    pattern = r"\{([^}]+)\}"
    matches = re.findall(pattern, content)

    variables = {}
    for i, var in enumerate(matches):
        var_name = var.strip()
        # First variable is typically primary (the main topic)
        is_primary = i == 0 or var_name.lower() in ["topic", "subject", "main_topic"]
        variables[var_name] = {
            "name": var_name,
            "is_primary": is_primary,
            "order": i,
        }

    return variables


async def _get_template_with_stats(template: Template, db: DBSession) -> dict:
    """Get template dict with usage stats calculated."""
    usage_result = await db.execute(
        select(
            func.count(TemplateUsage.id).label("total"),
            func.sum(func.cast(TemplateUsage.was_approved, type_=func.integer())).label("approved"),
        ).where(TemplateUsage.template_id == template.id)
    )
    usage_stats = usage_result.first()

    usage_count = usage_stats.total if usage_stats else 0
    approved_count = usage_stats.approved if usage_stats and usage_stats.approved else 0
    approval_rate = approved_count / usage_count if usage_count > 0 else 0.0

    return {
        **template.__dict__,
        "usage_count": usage_count,
        "approval_rate": approval_rate,
    }


# ============ User Template Endpoints ============

@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> TemplateResponse:
    """
    Create a new user template with auto-extraction of variables.
    User templates are private by default (only visible to the creator).
    """
    # Extract variables from content
    variables = _extract_variables(template_data.content)

    template = Template(
        name=template_data.name,
        description=template_data.description,
        content=template_data.content,
        format=template_data.format,
        category=template_data.category,
        tags=template_data.tags,
        variables=variables,
        use_cases=template_data.use_cases,
        tone_fit=template_data.tone_fit,
        platform=template_data.platform,
        image_template=template_data.image_template,
        carousel_slides=template_data.carousel_slides,
        media_placeholders=template_data.media_placeholders,
        created_by=current_user.id,
        is_system=False,  # User templates are not system templates
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return TemplateResponse.model_validate(template)


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    current_user: CurrentUser,
    db: DBSession,
    category: Optional[TemplateCategory] = Query(None),
    format_filter: Optional[DraftFormat] = Query(None, alias="format"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    is_active: bool = Query(True),
    scope: Optional[str] = Query(
        None,
        description="Filter scope: 'system' (platform templates), 'user' (my templates), 'contributed' (community), 'all' (default)"
    ),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> TemplateListResponse:
    """
    List templates with optional filters.

    By default, users see:
    - All system templates (is_system=True)
    - Their own templates (created_by=current_user)
    - Approved community contributions (contribution_status=approved)
    """
    query = select(Template).where(Template.is_active == is_active)

    # Apply scope filter
    if scope == "system":
        # Only system templates
        query = query.where(Template.is_system == True)
    elif scope == "user":
        # Only user's own templates
        query = query.where(
            Template.is_system == False,
            Template.created_by == current_user.id
        )
    elif scope == "contributed":
        # Only approved community contributions (not user's own)
        query = query.where(
            Template.is_system == False,
            Template.contribution_status == ContributionStatus.APPROVED,
            Template.created_by != current_user.id
        )
    else:
        # Default: show system + user's own + approved contributions
        query = query.where(
            or_(
                Template.is_system == True,  # System templates
                Template.created_by == current_user.id,  # User's own templates
                (  # Approved community contributions
                    (Template.contribution_status == ContributionStatus.APPROVED) &
                    (Template.is_system == False)
                )
            )
        )

    if category:
        query = query.where(Template.category == category)

    if format_filter:
        query = query.where(Template.format == format_filter)

    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        # Filter templates that contain any of the specified tags
        query = query.where(Template.tags.op("&&")(tag_list))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results - system templates first, then by date
    query = query.order_by(
        Template.is_system.desc(),
        Template.created_at.desc()
    ).offset(offset).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()

    # Calculate usage stats for each template
    template_responses = []
    for template in templates:
        template_dict = await _get_template_with_stats(template, db)
        template_responses.append(TemplateResponse.model_validate(template_dict))

    return TemplateListResponse(templates=template_responses, total=total)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> TemplateResponse:
    """
    Get a specific template.

    Users can access:
    - System templates
    - Their own templates
    - Approved community contributions
    """
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check access permissions
    can_access = (
        template.is_system or
        template.created_by == current_user.id or
        template.contribution_status == ContributionStatus.APPROVED or
        current_user.is_admin
    )

    if not can_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this template",
        )

    template_dict = await _get_template_with_stats(template, db)
    return TemplateResponse.model_validate(template_dict)


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: UUID,
    template_data: TemplateUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> TemplateResponse:
    """
    Update a template.

    Users can only update their own templates.
    Admins can update any template including system templates.
    """
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check ownership - only creator or admin can update
    if template.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own templates",
        )

    # System templates can only be updated by admins
    if template.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update system templates",
        )

    # Update fields
    update_data = template_data.model_dump(exclude_unset=True)

    # Re-extract variables if content changed
    if "content" in update_data:
        update_data["variables"] = _extract_variables(update_data["content"])

    for field, value in update_data.items():
        setattr(template, field, value)

    await db.commit()
    await db.refresh(template)

    template_dict = await _get_template_with_stats(template, db)
    return TemplateResponse.model_validate(template_dict)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    """
    Soft delete a template.

    Users can only delete their own templates.
    Admins can delete any template including system templates.
    """
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check ownership - only creator or admin can delete
    if template.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own templates",
        )

    # System templates can only be deleted by admins
    if template.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete system templates",
        )

    template.is_active = False
    await db.commit()


@router.post("/{template_id}/duplicate", response_model=TemplateResponse)
async def duplicate_template(
    template_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> TemplateResponse:
    """
    Duplicate a template.

    Creates a user-owned copy of any accessible template (system, own, or contributed).
    The copy is always a user template, not a system template.
    """
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check access - can duplicate system, own, or approved contributed templates
    can_access = (
        template.is_system or
        template.created_by == current_user.id or
        template.contribution_status == ContributionStatus.APPROVED
    )

    if not can_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to duplicate this template",
        )

    # Create copy as user template
    new_template = Template(
        name=f"{template.name} (Copy)",
        description=template.description,
        content=template.content,
        format=template.format,
        category=template.category,
        tags=template.tags.copy() if template.tags else [],
        variables=template.variables.copy() if template.variables else {},
        use_cases=template.use_cases.copy() if template.use_cases else [],
        tone_fit=template.tone_fit.copy() if template.tone_fit else [],
        platform=template.platform,
        image_template=template.image_template,
        carousel_slides=template.carousel_slides.copy() if template.carousel_slides else None,
        media_placeholders=template.media_placeholders.copy() if template.media_placeholders else None,
        created_by=current_user.id,
        is_system=False,  # Duplicates are always user templates
    )
    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)

    return TemplateResponse.model_validate(new_template)


@router.post("/match", response_model=TemplateMatchResponse)
async def match_templates(
    match_request: TemplateMatchRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> TemplateMatchResponse:
    """
    Find best matching templates for a given context.

    Only searches accessible templates (system + user's own + approved contributions).
    """
    # Base query with access control
    query = select(Template).where(
        Template.is_active == True,
        or_(
            Template.is_system == True,
            Template.created_by == current_user.id,
            Template.contribution_status == ContributionStatus.APPROVED
        )
    )

    if match_request.format:
        query = query.where(Template.format == match_request.format)

    if match_request.category:
        query = query.where(Template.category == match_request.category)

    result = await db.execute(query.limit(match_request.limit * 2))
    templates = result.scalars().all()

    # Score templates
    scored_templates = []
    match_scores = {}

    for template in templates:
        score = 0.5  # Base score

        # Boost system templates slightly
        if template.is_system:
            score += 0.1

        # Boost if tone fits
        if match_request.tone_preferences and template.tone_fit:
            tone_overlap = len(set(template.tone_fit) & set(match_request.tone_preferences.keys()))
            score += tone_overlap * 0.1

        # Get approval rate for this profile
        usage_result = await db.execute(
            select(
                func.count(TemplateUsage.id).label("total"),
                func.sum(func.cast(TemplateUsage.was_approved, type_=func.integer())).label("approved"),
            ).where(
                TemplateUsage.template_id == template.id,
                TemplateUsage.profile_id == match_request.profile_id,
            )
        )
        usage_stats = usage_result.first()

        if usage_stats and usage_stats.total and usage_stats.total > 0:
            profile_approval_rate = (usage_stats.approved or 0) / usage_stats.total
            score += profile_approval_rate * 0.3

        scored_templates.append((template, score))
        match_scores[str(template.id)] = score

    # Sort by score and limit
    scored_templates.sort(key=lambda x: x[1], reverse=True)
    top_templates = scored_templates[: match_request.limit]

    return TemplateMatchResponse(
        templates=[TemplateResponse.model_validate(t[0]) for t in top_templates],
        match_scores=match_scores,
    )


# ============ Admin System Template Endpoints ============

@router.post("/admin/analyze", response_model=SystemTemplateAnalyzeResponse)
async def analyze_template_content(
    request: SystemTemplateAnalyzeRequest,
    admin_user: AdminUser,
    db: DBSession,
) -> SystemTemplateAnalyzeResponse:
    """
    [Admin Only] Analyze template content to extract metadata via LLM.

    Use this to preview what metadata will be extracted before creating a template.
    Admin can paste template text and see suggested name, description, category, etc.
    """
    result = await analyze_and_enrich_template(
        content=request.content,
        name=request.name,
        description=request.description,
    )

    return SystemTemplateAnalyzeResponse(
        variables=result.get("variables", {}),
        category=result.get("category", "tips"),
        tags=result.get("tags", []),
        use_cases=result.get("use_cases", []),
        tone_fit=result.get("tone_fit", ["professional"]),
        format=result.get("format", "post"),
        platform=result.get("platform", "linkedin"),
        suggested_name=result.get("suggested_name"),
        suggested_description=result.get("suggested_description"),
    )


@router.post("/admin/system", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_system_template(
    template_data: SystemTemplateCreate,
    admin_user: AdminUser,
    db: DBSession,
) -> TemplateResponse:
    """
    [Admin Only] Create a system template with automatic metadata extraction.

    Admins can paste template content and the system will:
    1. Extract variables from {placeholders}
    2. Use LLM to analyze and suggest category, tags, use_cases, tone_fit, etc.
    3. Admin can optionally override any suggested values

    System templates are visible to all users on the platform.
    """
    # Analyze template content with LLM
    analysis = await analyze_and_enrich_template(
        content=template_data.content,
        name=template_data.name,
        description=template_data.description,
        user_provided_category=template_data.category.value if template_data.category else None,
        user_provided_tags=template_data.tags,
        user_provided_use_cases=template_data.use_cases,
        user_provided_tone_fit=template_data.tone_fit,
        user_provided_format=template_data.format.value if template_data.format else None,
        user_provided_platform=template_data.platform,
    )

    # Use provided values or fall back to LLM suggestions
    name = template_data.name or analysis.get("suggested_name") or "Untitled Template"
    description = template_data.description or analysis.get("suggested_description")

    template = Template(
        name=name,
        description=description,
        content=template_data.content,
        format=template_data.format or analysis.get("format", "post"),
        category=template_data.category or analysis.get("category", "tips"),
        tags=analysis.get("tags", []),
        variables=analysis.get("variables", {}),
        use_cases=analysis.get("use_cases", []),
        tone_fit=analysis.get("tone_fit", ["professional"]),
        platform=template_data.platform or analysis.get("platform", "linkedin"),
        created_by=admin_user.id,
        is_system=True,  # Mark as system template
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return TemplateResponse.model_validate(template)


@router.get("/admin/system", response_model=TemplateListResponse)
async def list_system_templates(
    admin_user: AdminUser,
    db: DBSession,
    category: Optional[TemplateCategory] = Query(None),
    format_filter: Optional[DraftFormat] = Query(None, alias="format"),
    is_active: Optional[bool] = Query(None, description="Filter by active status, None shows all"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> TemplateListResponse:
    """
    [Admin Only] List all system templates including inactive ones.
    """
    query = select(Template).where(Template.is_system == True)

    if is_active is not None:
        query = query.where(Template.is_active == is_active)

    if category:
        query = query.where(Template.category == category)

    if format_filter:
        query = query.where(Template.format == format_filter)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.order_by(Template.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()

    template_responses = []
    for template in templates:
        template_dict = await _get_template_with_stats(template, db)
        template_responses.append(TemplateResponse.model_validate(template_dict))

    return TemplateListResponse(templates=template_responses, total=total)


# ============ User Contribution Endpoints ============

@router.post("/contribute", response_model=TemplateContributeResponse)
async def contribute_template(
    request: TemplateContributeRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> TemplateContributeResponse:
    """
    Submit a user template for contribution to the platform.

    Once submitted, the template goes into 'pending' status for admin review.
    If approved, the template becomes visible to all users as a community contribution.
    """
    result = await db.execute(
        select(Template).where(Template.id == request.template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Only owner can contribute their template
    if template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only contribute your own templates",
        )

    # Can't contribute system templates
    if template.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System templates cannot be contributed",
        )

    # Check if already pending or approved
    if template.contribution_status in [ContributionStatus.PENDING, ContributionStatus.APPROVED]:
        return TemplateContributeResponse(
            template_id=template.id,
            contribution_status=template.contribution_status,
            message=f"Template is already {template.contribution_status.value}",
        )

    # Submit for contribution
    template.is_contributed = True
    template.contribution_status = ContributionStatus.PENDING
    await db.commit()

    return TemplateContributeResponse(
        template_id=template.id,
        contribution_status=ContributionStatus.PENDING,
        message="Template submitted for review. You'll be notified when it's approved.",
    )


@router.post("/{template_id}/withdraw-contribution", response_model=TemplateContributeResponse)
async def withdraw_contribution(
    template_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> TemplateContributeResponse:
    """
    Withdraw a template from contribution review.

    Can only withdraw templates that are pending review.
    Already approved templates remain public.
    """
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    if template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only withdraw your own templates",
        )

    if template.contribution_status != ContributionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only withdraw pending contributions. Current status: {template.contribution_status.value}",
        )

    template.is_contributed = False
    template.contribution_status = ContributionStatus.NONE
    await db.commit()

    return TemplateContributeResponse(
        template_id=template.id,
        contribution_status=ContributionStatus.NONE,
        message="Contribution withdrawn successfully",
    )


# ============ Admin Contribution Review Endpoints ============

@router.get("/admin/contributions", response_model=TemplateListResponse)
async def list_pending_contributions(
    admin_user: AdminUser,
    db: DBSession,
    status_filter: Optional[ContributionStatus] = Query(
        ContributionStatus.PENDING,
        alias="status",
        description="Filter by contribution status"
    ),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> TemplateListResponse:
    """
    [Admin Only] List templates pending contribution review.
    """
    query = select(Template).where(
        Template.is_system == False,
        Template.is_contributed == True,
    )

    if status_filter:
        query = query.where(Template.contribution_status == status_filter)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results, oldest first for FIFO review
    query = query.order_by(Template.updated_at.asc()).offset(offset).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()

    template_responses = []
    for template in templates:
        template_dict = await _get_template_with_stats(template, db)
        template_responses.append(TemplateResponse.model_validate(template_dict))

    return TemplateListResponse(templates=template_responses, total=total)


@router.post("/admin/contributions/{template_id}/review", response_model=TemplateContributeResponse)
async def review_contribution(
    template_id: UUID,
    review: ContributionReviewRequest,
    admin_user: AdminUser,
    db: DBSession,
) -> TemplateContributeResponse:
    """
    [Admin Only] Approve or reject a contributed template.

    Approved templates become visible to all users.
    Rejected templates remain private to the owner.
    """
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    if template.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot review system templates",
        )

    if template.contribution_status != ContributionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template is not pending review. Status: {template.contribution_status.value}",
        )

    if review.approved:
        template.contribution_status = ContributionStatus.APPROVED
        message = "Template approved and is now visible to all users"
    else:
        template.contribution_status = ContributionStatus.REJECTED
        message = f"Template rejected. Reason: {review.rejection_reason or 'No reason provided'}"

    await db.commit()

    return TemplateContributeResponse(
        template_id=template.id,
        contribution_status=template.contribution_status,
        message=message,
    )
