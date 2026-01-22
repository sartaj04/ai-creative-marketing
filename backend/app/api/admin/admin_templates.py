"""
Admin Template API endpoints.

Admin-only endpoints for template management including:
- Upload and update templates
- Trigger dummy render QA
- Approve/deprecate templates
- Version management
- AI-powered template creation
"""
import base64
import uuid as uuid_module
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy import select, func
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
from app.schemas.ai_processing import (
    AIUploadResponse,
    AIProcessingStatus,
    AIProcessingStatusResponse,
    TemplateAIResultResponse,
    FeedbackRequest,
    BrandPreviewsResponse,
    BrandPreviewResult,
    AvailableBrandsResponse,
    BrandProfileInfo,
    AcceptAIResultRequest,
    SourceType,
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
    
    This renders the template with worst-case test data:
    - Maximum length text in all zones
    - Placeholder images
    - Stress-test parameters
    
    Template must pass QA before it can be approved.
    """
    from app.services.dummy_render import run_dummy_render
    
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Skip if already passed and not forcing re-render
    if template.dummy_render_passed and not params.force_rerender:
        return DummyRenderResponse(
            template_id=template.id,
            passed=True,
            render_url=template.dummy_render_url,
            issues=[],
            rendered_at=datetime.now(timezone.utc)
        )
    
    # Run dummy render
    render_result = await run_dummy_render(
        template_id=str(template.id),
        html_code=template.html_code,
        css_code=template.css_code,
        variables=template.variables,
        aspect_ratio=params.aspect_ratio
    )
    
    # Update template with results
    template.dummy_render_passed = render_result["passed"]
    template.dummy_render_url = render_result.get("render_url")
    
    await db.commit()
    
    return DummyRenderResponse(
        template_id=template.id,
        passed=render_result["passed"],
        render_url=render_result.get("render_url"),
        issues=render_result.get("issues", []),
        rendered_at=datetime.now(timezone.utc)
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
    
    This is a helper endpoint to auto-generate layout_schema and variables.
    The result can be reviewed and applied via the update endpoint.
    """
    from app.services.template_normalizer import normalize_template as run_normalization
    
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Run normalization
    norm_result = await run_normalization(
        html_code=template.html_code,
        css_code=template.css_code
    )
    
    return TemplateNormalizationResult(**norm_result)


# === AI PROCESSING ENDPOINTS ===

# In-memory storage for AI processing state (in production, use Redis or DB)
_ai_processing_state: dict = {}


@router.post("/upload", response_model=AIUploadResponse)
async def upload_template_for_ai(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload an image or HTML file for AI processing.

    Accepts:
    - Images: PNG, JPG, JPEG, WebP
    - HTML: .html files

    For images, uses CrewAI multi-agent pipeline:
    1. Analyzer Agent - Extracts layout, colors, zones
    2. Generator Agent - Creates HTML/CSS with STRICT standard variable names
    3. Reviewer Agent - Validates template quality and compliance

    For HTML files, uses direct analysis (no generation needed).

    Returns a template_id and job_id for tracking progress.
    """
    from app.services.s3_storage import upload_template_asset

    # Validate file type
    filename = file.filename or "upload"
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    allowed_image_types = {"png", "jpg", "jpeg", "webp"}
    allowed_html_types = {"html", "htm"}

    if extension not in allowed_image_types and extension not in allowed_html_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{extension}'. Allowed: {allowed_image_types | allowed_html_types}"
        )

    # Read file content
    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file uploaded"
        )

    # Determine source type
    is_image = extension in allowed_image_types
    source_type = SourceType.IMAGE if is_image else SourceType.HTML

    # Generate IDs
    template_id = uuid_module.uuid4()
    job_id = str(uuid_module.uuid4())[:8]

    # Upload original to S3
    mime_type = file.content_type or ("image/png" if is_image else "text/html")
    s3_path = f"templates/{template_id}/source/original.{extension}"

    try:
        source_url = await upload_template_asset(
            file_bytes=content,
            s3_path=s3_path,
            content_type=mime_type
        )
    except Exception as e:
        # If S3 fails, continue without source URL
        source_url = None

    try:
        if is_image:
            # Use LangChain + Vertex AI pipeline for images
            from app.services.langchain_pipeline import TemplateGenerator
            import logging

            logging.info(f"Starting LangChain pipeline for template {template_id}")

            generator = TemplateGenerator(verbose=True)
            result = generator.generate_template(
                image_bytes=content,
                mime_type=mime_type,
                template_id=str(template_id)
            )

            # Log review status
            logging.info(f"LangChain pipeline completed. Review status: {result.review_status}")
            if result.review_issues:
                logging.warning(f"Review issues: {result.review_issues}")

            # Store processing state with CrewAI result
            _ai_processing_state[str(template_id)] = {
                "template_id": str(template_id),
                "job_id": job_id,
                "status": AIProcessingStatus.COMPLETED,
                "source_type": source_type.value,
                "source_url": source_url,
                "source_bytes_b64": base64.b64encode(content).decode(),
                "source_mime_type": mime_type,
                "progress": 100,
                "current_step": "Completed",
                "result": {
                    "template_id": str(template_id),
                    "html_code": result.html_code,
                    "css_code": result.css_code,
                    "suggested_name": result.suggested_name,
                    "suggested_description": result.suggested_description,
                    "suggested_industry": result.suggested_industry,
                    "suggested_platform": result.suggested_platform,
                    "suggested_objective": result.suggested_objective,
                    "suggested_aspect_ratios": result.suggested_aspect_ratios,
                    "detected_zones": result.detected_zones,
                    "detected_variables": result.detected_variables,
                    "layout_schema": result.layout_schema,
                    "source_type": source_type.value,
                    "source_url": source_url,
                    "analysis_notes": result.analysis_notes,
                    "confidence_score": result.confidence_score,
                    "review_status": result.review_status,
                    "review_issues": result.review_issues,
                },
                "error": None,
            }
        else:
            # For HTML files, use direct analysis (no generation needed)
            from app.services.template_ai_processor import get_template_ai_processor

            processor = get_template_ai_processor()
            html_content = content.decode("utf-8", errors="replace")
            result = await processor.process_uploaded_html(
                html_content=html_content,
                css_content=""
            )

            # Store processing state
            _ai_processing_state[str(template_id)] = {
                "template_id": str(template_id),
                "job_id": job_id,
                "status": AIProcessingStatus.COMPLETED,
                "source_type": source_type.value,
                "source_url": source_url,
                "source_bytes_b64": None,
                "source_mime_type": None,
                "progress": 100,
                "current_step": "Completed",
                "result": {
                    "template_id": str(template_id),
                    "html_code": result.html_code,
                    "css_code": result.css_code,
                    "suggested_name": result.suggested_name,
                    "suggested_description": result.suggested_description,
                    "suggested_industry": result.suggested_industry,
                    "suggested_platform": result.suggested_platform,
                    "suggested_objective": result.suggested_objective,
                    "suggested_aspect_ratios": result.suggested_aspect_ratios,
                    "detected_zones": result.detected_zones,
                    "detected_variables": result.detected_variables,
                    "layout_schema": result.layout_schema,
                    "source_type": source_type.value,
                    "source_url": source_url,
                    "analysis_notes": result.analysis_notes,
                    "confidence_score": result.confidence_score,
                },
                "error": None,
            }

        return AIUploadResponse(
            template_id=template_id,
            job_id=job_id,
            status=AIProcessingStatus.COMPLETED,
            message="AI processing completed successfully via CrewAI pipeline" if is_image else "AI processing completed successfully",
            source_url=source_url
        )

    except Exception as e:
        import logging
        logging.error(f"AI processing failed for template {template_id}: {str(e)}")

        # Store error state
        _ai_processing_state[str(template_id)] = {
            "template_id": str(template_id),
            "job_id": job_id,
            "status": AIProcessingStatus.FAILED,
            "source_type": source_type.value,
            "source_url": source_url,
            "progress": 0,
            "current_step": "Failed",
            "result": None,
            "error": str(e),
        }

        return AIUploadResponse(
            template_id=template_id,
            job_id=job_id,
            status=AIProcessingStatus.FAILED,
            message=f"AI processing failed: {str(e)}",
            source_url=source_url
        )


@router.get("/{template_id}/ai-status", response_model=AIProcessingStatusResponse)
async def get_ai_processing_status(
    template_id: UUID,
    admin: User = Depends(get_admin_user),
):
    """
    Get the status of AI processing for a template.
    
    Returns progress, current step, and result if completed.
    """
    state = _ai_processing_state.get(str(template_id))
    
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI processing found for this template"
        )
    
    result = None
    if state.get("result"):
        result = TemplateAIResultResponse(**state["result"])
    
    return AIProcessingStatusResponse(
        template_id=template_id,
        job_id=state["job_id"],
        status=state["status"],
        progress=state.get("progress", 0),
        current_step=state.get("current_step", "Unknown"),
        result=result,
        error=state.get("error")
    )


@router.post("/{template_id}/feedback", response_model=TemplateAIResultResponse)
async def submit_feedback(
    template_id: UUID,
    feedback: FeedbackRequest,
    admin: User = Depends(get_admin_user),
):
    """
    Submit feedback to adjust AI-generated template.
    
    Examples:
    - "Make the headline area larger"
    - "This is for Instagram Stories, not feed posts"
    - "Add a discount badge zone"
    - "The CTA should be more prominent"
    - "Change the industry to healthcare"
    """
    from app.services.template_ai_processor import get_template_ai_processor
    
    state = _ai_processing_state.get(str(template_id))
    
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI processing found for this template"
        )
    
    if not state.get("result"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No AI result available to refine"
        )
    
    current_result = state["result"]
    
    # Prepare current metadata
    current_metadata = {
        "template_id": str(template_id),
        "name": current_result["suggested_name"],
        "description": current_result["suggested_description"],
        "industry": current_result["suggested_industry"],
        "platform": current_result["suggested_platform"],
        "objective": current_result["suggested_objective"],
        "aspect_ratios": current_result["suggested_aspect_ratios"],
        "source_type": current_result["source_type"],
        "source_url": current_result.get("source_url"),
    }
    
    # Get original image if available
    original_image = None
    original_mime = None
    if state.get("source_bytes_b64"):
        original_image = base64.b64decode(state["source_bytes_b64"])
        original_mime = state.get("source_mime_type", "image/png")
    
    # Process feedback
    processor = get_template_ai_processor()
    
    try:
        result = await processor.apply_feedback(
            current_html=current_result["html_code"],
            current_css=current_result["css_code"],
            current_metadata=current_metadata,
            feedback=feedback.feedback,
            original_image_bytes=original_image,
            original_image_mime=original_mime
        )
        
        # Update state with new result
        new_result = {
            "template_id": str(template_id),
            "html_code": result.html_code,
            "css_code": result.css_code,
            "suggested_name": result.suggested_name,
            "suggested_description": result.suggested_description,
            "suggested_industry": result.suggested_industry,
            "suggested_platform": result.suggested_platform,
            "suggested_objective": result.suggested_objective,
            "suggested_aspect_ratios": result.suggested_aspect_ratios,
            "detected_zones": result.detected_zones,
            "detected_variables": result.detected_variables,
            "layout_schema": result.layout_schema,
            "source_type": current_result["source_type"],
            "source_url": current_result.get("source_url"),
            "analysis_notes": result.analysis_notes,
            "confidence_score": result.confidence_score,
        }
        
        state["result"] = new_result
        
        # Track feedback history
        if "feedback_history" not in state:
            state["feedback_history"] = []
        state["feedback_history"].append({
            "feedback": feedback.feedback,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        
        return TemplateAIResultResponse(**new_result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process feedback: {str(e)}"
        )


@router.get("/{template_id}/brand-previews", response_model=BrandPreviewsResponse)
async def get_brand_previews(
    template_id: UUID,
    admin: User = Depends(get_admin_user),
):
    """
    Get template rendered with different sample brand profiles.
    
    Returns HTML previews that can be rendered in iframes on the frontend.
    No server-side browser rendering needed!
    
    Available brands:
    - tech_startup: Modern SaaS/startup look
    - ecommerce_sale: Bold sale/promotion style
    - healthcare: Clean, trustworthy medical
    - food_restaurant: Warm appetizing food/restaurant
    - luxury_premium: Elegant black & gold luxury
    - real_estate: Professional property listings
    - fitness_gym: Energetic fitness/sports
    """
    from app.services.brand_preview_renderer import render_all_brand_previews
    
    state = _ai_processing_state.get(str(template_id))
    
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI processing found for this template"
        )
    
    if not state.get("result"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No AI result available to preview"
        )
    
    current_result = state["result"]
    
    # Debug: Log what HTML/CSS we have
    html_code = current_result.get("html_code", "")
    css_code = current_result.get("css_code", "")
    import logging
    logging.info(f"Brand preview - HTML length: {len(html_code)}, CSS length: {len(css_code)}")
    logging.info(f"Brand preview - HTML preview: {html_code[:200] if html_code else 'EMPTY'}")
    
    # Render all brand previews (synchronous - just string manipulation!)
    previews = render_all_brand_previews(
        html_code=html_code,
        css_code=css_code,
    )
    
    # Convert to response format
    preview_results = [
        BrandPreviewResult(
            brand_id=p.brand_id,
            brand_name=p.brand_name,
            rendered_html=p.rendered_html,
            colors_used=p.colors_used,
            font_family=p.font_family,
            sample_content=p.sample_content
        )
        for p in previews
    ]
    
    return BrandPreviewsResponse(
        template_id=template_id,
        previews=preview_results,
        total_brands=len(previews)
    )


@router.get("/ai/available-brands", response_model=AvailableBrandsResponse)
async def get_available_brands(
    admin: User = Depends(get_admin_user),
):
    """
    Get list of available brand profiles for preview.
    """
    from app.services.brand_preview_renderer import get_all_brand_profiles
    
    profiles = get_all_brand_profiles()
    
    return AvailableBrandsResponse(
        brands=[
            BrandProfileInfo(
                id=p.id,
                name=p.name,
                primary_color=p.primary_color,
                secondary_color=p.secondary_color,
                background_color=p.background_color,
                description=f"Sample brand for {p.name.lower()} style templates"
            )
            for p in profiles
        ]
    )


@router.post("/{template_id}/accept-ai", response_model=AdminTemplateResponse)
async def accept_ai_result(
    template_id: UUID,
    request: AcceptAIResultRequest = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Accept the current AI-processed result and save as a template.
    
    This creates a new template in DRAFT status from the AI result.
    The template still needs QA validation and approval before production use.
    
    Optional overrides can be provided in the request body.
    """
    state = _ai_processing_state.get(str(template_id))
    
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI processing found for this template"
        )
    
    if not state.get("result"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No AI result available to accept"
        )
    
    result = state["result"]
    
    # Apply overrides if provided
    name = result["suggested_name"]
    description = result["suggested_description"]
    industry = result["suggested_industry"]
    platform = result["suggested_platform"]
    objective = result["suggested_objective"]
    
    if request:
        if request.name:
            name = request.name
        if request.description:
            description = request.description
        if request.industry:
            industry = request.industry
        if request.platform:
            platform = request.platform
        if request.objective:
            objective = request.objective
    
    # Map to enum values (with fallback to general)
    try:
        industry_enum = TemplateIndustry(industry.lower())
    except ValueError:
        industry_enum = TemplateIndustry.GENERAL
    
    try:
        platform_enum = TemplatePlatform(platform.lower())
    except ValueError:
        platform_enum = TemplatePlatform.GENERAL
    
    try:
        objective_enum = TemplateObjective(objective.lower())
    except ValueError:
        objective_enum = TemplateObjective.GENERAL
    
    # Create template
    template = Template(
        id=template_id,
        name=name,
        description=description,
        category="general",
        status=TemplateStatus.DRAFT,
        industry=industry_enum,
        platform=platform_enum,
        objective=objective_enum,
        format_type=FormatType.STATIC,
        html_code=result["html_code"],
        css_code=result["css_code"],
        layout_schema=result.get("layout_schema"),
        aspect_ratios=result.get("suggested_aspect_ratios", ["1:1"]),
        variables=result.get("detected_variables", []),
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
        html_code=result["html_code"],
        css_code=result["css_code"],
        layout_schema=result.get("layout_schema"),
        variables=result.get("detected_variables", []),
        change_notes=f"Created via AI processing. Source: {result.get('source_type', 'unknown')}. {result.get('analysis_notes', '')}",
        created_by=admin.id,
    )
    db.add(version)
    
    # Create approval log entry
    log = TemplateApprovalLog(
        template_id=template.id,
        action="ai_create",
        from_status=None,
        to_status=TemplateStatus.DRAFT.value,
        template_version=1,
        admin_id=admin.id,
        notes=f"Template created via AI processing from {result.get('source_type', 'unknown')} upload",
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(template)
    
    # Clean up AI state
    del _ai_processing_state[str(template_id)]
    
    return template

