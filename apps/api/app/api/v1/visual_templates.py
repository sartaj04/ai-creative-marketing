"""Visual template endpoints — browse, create, update, preview."""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession, get_user_profile_ids
from app.models.slide_template import SlideTemplate
from app.models.visual_template import VisualTemplate, VisualTemplateType
from app.schemas.visual_template import (
    VisualTemplateCreateRequest,
    VisualTemplateDraft,
    VisualTemplateListResponse,
    VisualTemplatePreviewRequest,
    VisualTemplateResponse,
    VisualTemplateUpdateRequest,
)
from app.services.template_renderer_service import get_template_renderer
from app.services.storage_service import get_storage_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=VisualTemplateListResponse)
async def list_visual_templates(
    current_user: CurrentUser,
    db: DBSession,
    type_filter: Optional[VisualTemplateType] = Query(None, alias="type"),
    category: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List visual templates — system templates + user's custom templates."""
    query = select(VisualTemplate).where(VisualTemplate.is_active == True)

    # Show system templates + user's own templates
    query = query.where(
        (VisualTemplate.is_system == True) |
        (VisualTemplate.created_by == current_user.id)
    )

    if type_filter:
        query = query.where(VisualTemplate.type == type_filter)
    if category:
        query = query.where(VisualTemplate.category == category)
    if platform:
        query = query.where(
            (VisualTemplate.platform == platform) |
            (VisualTemplate.platform == "both")
        )
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        for tag in tag_list:
            query = query.where(VisualTemplate.tags.contains([tag]))
    if search:
        query = query.where(VisualTemplate.name.ilike(f"%{search}%"))

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Fetch with slides eagerly loaded
    query = query.options(selectinload(VisualTemplate.slides)).order_by(
        VisualTemplate.is_system.desc(),
        VisualTemplate.created_at.desc(),
    ).offset(offset).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()

    return VisualTemplateListResponse(
        templates=[VisualTemplateResponse.model_validate(t) for t in templates],
        total=total,
    )


@router.get("/{template_id}", response_model=VisualTemplateResponse)
async def get_visual_template(
    template_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """Get a specific visual template."""
    result = await db.execute(
        select(VisualTemplate)
        .options(selectinload(VisualTemplate.slides))
        .where(VisualTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visual template not found",
        )

    # Only allow access to system templates or user's own
    if not template.is_system and template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return VisualTemplateResponse.model_validate(template)


@router.post("", response_model=VisualTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_visual_template(
    request: VisualTemplateCreateRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Create a custom visual template.

    For carousel templates, pass a `slides` array with per-slide HTML and variable schemas.
    Each slide will be saved as a SlideTemplate record, enabling deterministic draft generation.
    """
    # Validate at least one rendering source
    if not request.html_template and not request.canvas_json and not request.slides:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template must have either html_template, canvas_json, or a slides array",
        )

    # Derive slide_count from slides array if provided
    slide_count = request.slide_count
    if request.slides:
        slide_count = len(request.slides)

    template = VisualTemplate(
        name=request.name,
        type=VisualTemplateType(request.type),
        category=request.category,
        html_template=request.html_template,
        canvas_json=request.canvas_json,
        variables_schema=request.variables_schema,
        slide_count=slide_count,
        slides_schema=request.slides_schema,
        default_values=request.default_values,
        tags=request.tags,
        platform=request.platform,
        dimensions=request.dimensions,
        is_system=False,
        created_by=current_user.id,
    )
    db.add(template)
    await db.flush()  # Obtain template.id without committing

    # Create per-slide SlideTemplate records if slides array provided
    if request.slides:
        for i, slide_data in enumerate(request.slides):
            slide = SlideTemplate(
                visual_template_id=template.id,
                html_structure=slide_data.html_structure,
                variable_schema=slide_data.variable_schema,
                default_values=slide_data.default_values,
                order=i + 1,  # 1-indexed
            )
            db.add(slide)

    await db.commit()
    await db.refresh(template)
    await db.refresh(template, attribute_names=["slides"])

    return VisualTemplateResponse.model_validate(template)


@router.put("/{template_id}", response_model=VisualTemplateResponse)
async def update_visual_template(
    template_id: UUID,
    request: VisualTemplateUpdateRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Update a custom visual template (user-created only)."""
    result = await db.execute(
        select(VisualTemplate).where(VisualTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visual template not found",
        )

    if template.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system templates",
        )
    if template.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only modify your own templates",
        )

    # Apply updates
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    await db.commit()
    await db.refresh(template)

    return VisualTemplateResponse.model_validate(template)


@router.post("/{template_id}/preview")
async def preview_visual_template(
    template_id: UUID,
    request: VisualTemplatePreviewRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Render a preview of a template with custom variables. Returns PNG image URL."""
    result = await db.execute(
        select(VisualTemplate).where(VisualTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visual template not found",
        )

    if not template.html_template:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template has no HTML content for rendering",
        )

    # Render preview
    renderer = await get_template_renderer()
    dimensions = template.dimensions or {"width": 1080, "height": 1080}
    png_bytes = await renderer.render_template(
        html_template=template.html_template,
        variables=request.variables,
        width=dimensions.get("width", 1080),
        height=dimensions.get("height", 1080),
        brand_overrides=request.brand_overrides,
    )

    # Upload preview to S3 with ephemeral key
    storage = get_storage_service()
    url, key = await storage.upload_image(
        file_bytes=png_bytes,
        content_type="image/png",
        prefix=f"previews/{current_user.id}",
    )

    return {"preview_url": url, "storage_key": key}


@router.post("/generate", response_model=VisualTemplateDraft, status_code=status.HTTP_200_OK)
async def generate_visual_template(
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(..., description="Image or PDF to replicate as a template"),
    template_type: str = Query("image", description="image or carousel"),
    aspect_ratio: str = Query("1:1", description="1:1, 16:9, or 9:16"),
):
    """Generate an editable HTML/CSS template from an uploaded image/PDF.

    Uses a multi-agent pipeline:
    1. Vision Analyzer (Gemini) — extracts layout spec
    2. Layout Generator (Claude) — produces HTML/CSS with {{variable}} slots
    3. Image Source (Unsplash + Nano Banana) — fetches/generates placeholder images
    4. Review Agent (Claude) — validates quality
    
    Returns a draft template without saving to the database.
    """
    # Validate file
    if not file.content_type or not (
        file.content_type.startswith("image/") or file.content_type == "application/pdf"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image (PNG, JPG, WebP) or PDF",
        )

    if template_type not in ("image", "carousel"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="template_type must be 'image' or 'carousel'",
        )

    # Read file bytes
    file_bytes = await file.read()
    if len(file_bytes) > 30 * 1024 * 1024:  # 30MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum 30MB.",
        )

    # Handle PDF — convert pages to a vertically stacked image for Gemini
    pdf_page_count: Optional[int] = None
    if file.content_type == "application/pdf":
        try:
            import fitz  # PyMuPDF
            from PIL import Image
            import io
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            images = []
            for i in range(len(doc)):
                page = doc[i]
                pix = page.get_pixmap(dpi=150) # moderate DPI to prevent massive images
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                images.append(img)
            # Capture page count BEFORE closing — used to override Vision Analyzer's guess
            pdf_page_count = len(images)
            doc.close()

            if not images:
                raise ValueError("PDF has no pages")

            # Stack images vertically so Gemini sees all slides in one tall image
            widths, heights = zip(*(i.size for i in images))
            max_w = max(widths)
            total_h = sum(heights)

            stacked = Image.new('RGB', (max_w, total_h), color='white')
            y_offset = 0
            for img in images:
                stacked.paste(img, (0, y_offset))
                y_offset += img.height

            out_io = io.BytesIO()
            stacked.save(out_io, format="PNG")
            file_bytes = out_io.getvalue()
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF support requires PyMuPDF. Please upload an image instead.",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process PDF: {str(e)}",
            )

    # Run the generation pipeline
    from app.services.template_gen_graph import get_template_gen_graph
    pipeline = get_template_gen_graph()

    try:
        result = await pipeline.run(
            image_bytes=file_bytes,
            template_type=template_type,
            user_id=str(current_user.id),
            aspect_ratio=aspect_ratio,
            # For PDFs: inject known page count so Vision Analyzer's guess is overridden.
            # Gemini sees a stacked PNG and often returns slide_count=1 for multi-page PDFs.
            detected_slide_count=pdf_page_count,
        )
    except Exception as e:
        logger.error(f"Template generation pipeline failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Template generation failed: {str(e)}",
        )

    # Validate output
    html = result.get("html_template", "")
    slides_raw: list[dict] = result.get("slides", [])

    # For carousel: require either per-slide HTML or a monolithic fallback
    if template_type == "carousel" and not slides_raw and not html:
        errors = result.get("errors", ["Unknown error"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline produced no template. Errors: {'; '.join(errors)}",
        )
    if template_type == "image" and not html:
        errors = result.get("errors", ["Unknown error"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline produced no template. Errors: {'; '.join(errors)}",
        )

    # Determine dimensions
    dims = {"width": 1080, "height": 1080}
    if template_type == "carousel":
        dims["height"] = 1350
    elif template_type == "image":
        if aspect_ratio == "16:9":
            dims = {"width": 1920, "height": 1080}
        elif aspect_ratio == "9:16":
            dims = {"width": 1080, "height": 1920}

    # Extract all assets to combine
    media_assets = result.get("media_assets", [])
    from app.schemas.visual_template import SlideTemplateCreate
    slides = [
        SlideTemplateCreate(
            html_structure=s.get("html_structure", ""),
            variable_schema=s.get("variable_schema", {}),
            default_values=s.get("default_values", {}),
        )
        for s in slides_raw
        if s.get("html_structure")
    ]

    # Build and return draft
    draft = VisualTemplateDraft(
        name=result.get("template_name", "Generated Template"),
        type=template_type,
        category=result.get("template_category", "quote"),
        html_template=html,
        variables_schema=result.get("variables_schema", {}),
        slide_count=len(slides) if slides else (
            result.get("detected_slide_count", 1) if template_type == "carousel" else None
        ),
        default_values=result.get("default_values", {}),
        tags=["ai-generated"],
        dimensions=dims,
        slides=slides,
    )

    logger.info(
        f"Generated draft template returned to client "
        f"(type={template_type}, slides={len(slides)})."
    )
    return draft


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visual_template(
    template_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """Delete a custom visual template."""
    result = await db.execute(
        select(VisualTemplate).where(VisualTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visual template not found",
        )

    if template.is_system and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system templates",
        )
    if template.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own templates",
        )

    await db.delete(template)
    await db.commit()
