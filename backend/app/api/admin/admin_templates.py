"""
Admin Template API endpoints.

Admin-only endpoints for template management including:
- Create and update templates
- Approve/deprecate templates
- Version management
"""
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.template import (
    Template,
    TemplateStatus,
    FormatType,
    TemplateIndustry,
    TemplatePlatform,
    TemplateObjective,
)
from app.models.template_version import TemplateVersion
from app.models.template_approval_log import TemplateApprovalLog
from app.core.admin_auth import get_admin_user
from app.schemas.admin_template import (
    AdminTemplateCreate,
    AdminTemplateUpdate,
    AdminTemplateResponse,
    AdminTemplateListResponse,
    TemplateVersionResponse,
    TemplateApprovalLogResponse,
    DummyRenderRequest,
    DummyRenderResponse,
    ApproveTemplateRequest,
    DeprecateTemplateRequest,
    RevertTemplateRequest,
    TemplateNormalizationResult,
)


router = APIRouter()


# === LIST & GET ENDPOINTS ===

@router.get("/", response_model=List[AdminTemplateListResponse])
async def list_templates(
    status_filter: Optional[str] = Query(None, alias="status"),
    industry: Optional[str] = None,
    platform: Optional[str] = None,
    format_type: Optional[str] = None,
    search: Optional[str] = None,
    include_inactive: bool = False,
    limit: int = Query(50, le=100),
    offset: int = 0,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all templates with optional filters.
    
    Unlike user-facing API, this includes drafts and deprecated templates.
    """
    query = select(Template)
    
    # Filter by status
    if status_filter:
        query = query.where(Template.status == status_filter)
    
    # Filter by classification
    if industry:
        query = query.where(Template.industry == industry)
    if platform:
        query = query.where(Template.platform == platform)
    if format_type:
        query = query.where(Template.format_type == format_type)
    
    # Include inactive templates only if requested
    if not include_inactive:
        query = query.where(Template.is_active == True)
    
    # Search by name/description
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (Template.name.ilike(search_pattern)) |
            (Template.description.ilike(search_pattern))
        )
    
    # Order by newest first
    query = query.order_by(Template.created_at.desc())
    
    # Pagination
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    templates = result.scalars().all()
    
    return templates


@router.get("/{template_id}", response_model=AdminTemplateResponse)
async def get_template(
    template_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get full template details including code and schemas.
    """
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return template


# === CREATE & UPDATE ENDPOINTS ===

@router.post("/", response_model=AdminTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: AdminTemplateCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new template.
    
    Template is created in DRAFT status and requires:
    1. Dummy render QA pass
    2. Explicit admin approval
    
    Before it becomes available for user-facing generation.
    """
    # Create template with DRAFT status
    template = Template(
        name=data.name,
        description=data.description,
        category=data.category,
        segment=data.segment,
        status=TemplateStatus.DRAFT,
        industry=TemplateIndustry(data.industry.value),
        platform=TemplatePlatform(data.platform.value),
        objective=TemplateObjective(data.objective.value),
        format_type=FormatType(data.format_type.value),
        html_code=data.html_code,
        css_code=data.css_code,
        layout_schema=data.layout_schema,
        motion_schema=data.motion_schema,
        aspect_ratios=data.aspect_ratios,
        variables=data.variables,
        is_premium=data.is_premium,
        version=1,
        created_by=admin.id,
        dummy_render_passed=False,
    )
    
    db.add(template)
    await db.flush()
    
    # Create initial version record
    version = TemplateVersion(
        template_id=template.id,
        version=1,
        html_code=data.html_code,
        css_code=data.css_code,
        layout_schema=data.layout_schema,
        motion_schema=data.motion_schema,
        variables=data.variables,
        change_notes="Initial template creation",
        created_by=admin.id,
    )
    db.add(version)
    
    # Create approval log entry
    log = TemplateApprovalLog(
        template_id=template.id,
        action="create",
        from_status=None,
        to_status=TemplateStatus.DRAFT.value,
        template_version=1,
        admin_id=admin.id,
        notes="Template created",
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(template)
    
    return template


@router.patch("/{template_id}", response_model=AdminTemplateResponse)
async def update_template(
    template_id: UUID,
    data: AdminTemplateUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a template.
    
    - Updates reset dummy_render_passed to False (requires re-QA)
    - Creates a new version in version history
    - Increments version number
    """
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Check if template can be edited (not deprecated)
    if template.status == TemplateStatus.DEPRECATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit deprecated template. Create a new version instead."
        )
    
    # Track if code/schema changed (requires re-QA)
    code_changed = False
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    change_notes = update_data.pop("change_notes", None)
    
    for field, value in update_data.items():
        if field in ["html_code", "css_code", "layout_schema", "motion_schema", "variables"]:
            if getattr(template, field) != value:
                code_changed = True
        
        # Handle enums
        if field == "industry" and value:
            setattr(template, field, TemplateIndustry(value))
        elif field == "platform" and value:
            setattr(template, field, TemplatePlatform(value))
        elif field == "objective" and value:
            setattr(template, field, TemplateObjective(value))
        elif field == "format_type" and value:
            setattr(template, field, FormatType(value))
        else:
            setattr(template, field, value)
    
    # If code changed, reset QA and increment version
    if code_changed:
        template.dummy_render_passed = False
        template.dummy_render_url = None
        template.version += 1
        
        # If was approved, move back to draft
        if template.status == TemplateStatus.APPROVED:
            old_status = template.status.value
            template.status = TemplateStatus.DRAFT
            template.approved_by = None
            template.approved_at = None
            
            # Log status change
            log = TemplateApprovalLog(
                template_id=template.id,
                action="update_reset",
                from_status=old_status,
                to_status=TemplateStatus.DRAFT.value,
                template_version=template.version,
                admin_id=admin.id,
                notes="Code change reset approval status",
            )
            db.add(log)
        
        # Create version record
        version = TemplateVersion(
            template_id=template.id,
            version=template.version,
            html_code=template.html_code,
            css_code=template.css_code,
            layout_schema=template.layout_schema,
            motion_schema=template.motion_schema,
            variables=template.variables,
            change_notes=change_notes or "Template updated",
            created_by=admin.id,
        )
        db.add(version)
    
    await db.commit()
    await db.refresh(template)
    
    return template


# === DUMMY RENDER ENDPOINTS ===

@router.post("/{template_id}/render-dummy", response_model=DummyRenderResponse)
async def render_dummy(
    template_id: UUID,
    params: DummyRenderRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger dummy render QA validation.
    
    DEPRECATED: This endpoint is being migrated to a new Node.js Satori/Resvg render service.
    Currently returns HTTP 501 (Not Implemented).
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Dummy render is deprecated. New Satori-based render service coming soon."
    )


# === APPROVAL ENDPOINTS ===

@router.post("/{template_id}/approve", response_model=AdminTemplateResponse)
async def approve_template(
    template_id: UUID,
    request: ApproveTemplateRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a template for production use.
    
    Requirements:
    - Template must be in DRAFT status
    - Dummy render QA must have passed
    """
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Validate status
    if template.status != TemplateStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template is {template.status.value}, only DRAFT templates can be approved"
        )
    
    # Validate QA passed
    if not template.dummy_render_passed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template must pass dummy render QA before approval"
        )
    
    # Approve
    old_status = template.status.value
    template.status = TemplateStatus.APPROVED
    template.approved_by = admin.id
    template.approved_at = datetime.now(timezone.utc)
    
    # Log approval
    log = TemplateApprovalLog(
        template_id=template.id,
        action="approve",
        from_status=old_status,
        to_status=TemplateStatus.APPROVED.value,
        template_version=template.version,
        admin_id=admin.id,
        notes=request.notes,
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(template)
    
    return template


@router.post("/{template_id}/deprecate", response_model=AdminTemplateResponse)
async def deprecate_template(
    template_id: UUID,
    request: DeprecateTemplateRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deprecate a template.
    
    Deprecated templates:
    - Cannot be used for new generations
    - Are not shown to users
    - Cannot be edited
    - Can be reactivated if needed
    """
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    if template.status == TemplateStatus.DEPRECATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template is already deprecated"
        )
    
    # Deprecate
    old_status = template.status.value
    template.status = TemplateStatus.DEPRECATED
    
    # Log deprecation
    log = TemplateApprovalLog(
        template_id=template.id,
        action="deprecate",
        from_status=old_status,
        to_status=TemplateStatus.DEPRECATED.value,
        template_version=template.version,
        admin_id=admin.id,
        notes=request.notes,
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(template)
    
    return template


# === VERSION MANAGEMENT ===

@router.get("/{template_id}/versions", response_model=List[TemplateVersionResponse])
async def list_versions(
    template_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all versions of a template.
    """
    # Verify template exists
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Get versions
    result = await db.execute(
        select(TemplateVersion)
        .where(TemplateVersion.template_id == template_id)
        .order_by(TemplateVersion.version.desc())
    )
    versions = result.scalars().all()
    
    return versions


@router.post("/{template_id}/revert/{version}", response_model=AdminTemplateResponse)
async def revert_to_version(
    template_id: UUID,
    version: int,
    request: RevertTemplateRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revert template to a previous version.
    
    This creates a new version with the old code, not a true rollback.
    """
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Get the target version
    result = await db.execute(
        select(TemplateVersion).where(
            TemplateVersion.template_id == template_id,
            TemplateVersion.version == version
        )
    )
    target_version = result.scalar_one_or_none()
    
    if not target_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version} not found"
        )
    
    # Apply changes from target version
    template.html_code = target_version.html_code
    template.css_code = target_version.css_code
    template.layout_schema = target_version.layout_schema
    template.motion_schema = target_version.motion_schema
    template.variables = target_version.variables
    template.version += 1
    template.dummy_render_passed = False
    template.dummy_render_url = None
    
    # If was approved, reset to draft
    if template.status == TemplateStatus.APPROVED:
        template.status = TemplateStatus.DRAFT
        template.approved_by = None
        template.approved_at = None
    
    # Create new version record
    new_version = TemplateVersion(
        template_id=template.id,
        version=template.version,
        html_code=template.html_code,
        css_code=template.css_code,
        layout_schema=template.layout_schema,
        motion_schema=template.motion_schema,
        variables=template.variables,
        change_notes=f"Reverted to version {version}. {request.notes or ''}".strip(),
        created_by=admin.id,
    )
    db.add(new_version)
    
    # Log revert
    log = TemplateApprovalLog(
        template_id=template.id,
        action="revert",
        from_status=template.status.value,
        to_status=TemplateStatus.DRAFT.value,
        template_version=template.version,
        admin_id=admin.id,
        notes=f"Reverted to version {version}",
        action_metadata={"reverted_from": version}
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(template)
    
    return template


# === UTILITY ENDPOINTS ===

@router.get("/{template_id}/approval-logs", response_model=List[TemplateApprovalLogResponse])
async def list_approval_logs(
    template_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get approval/action history for a template.
    """
    result = await db.execute(
        select(TemplateApprovalLog)
        .where(TemplateApprovalLog.template_id == template_id)
        .order_by(TemplateApprovalLog.created_at.desc())
    )
    logs = result.scalars().all()
    
    return logs


@router.post("/{template_id}/normalize", response_model=TemplateNormalizationResult)
async def normalize_template(
    template_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Run template normalization to detect zones and extract variables.
    
    DEPRECATED: This endpoint is being replaced by structured Template JSON schemas.
    Templates will be pre-defined with explicit schemas rather than inferred.
    Currently returns HTTP 501 (Not Implemented).
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Template normalization is deprecated. Use structured Template JSON schemas instead."
    )


# === AI PROCESSING ENDPOINTS ===
# NOTE: AI processing endpoints have been removed during the render pipeline refactor.
# AI-based template generation (upload, feedback, brand previews) is deprecated.
# Use create_template with structured Template JSON instead.
# See implementation_plan.md for details on the new Satori/Resvg render service.


