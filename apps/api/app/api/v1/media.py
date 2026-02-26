"""Media endpoints — image generation, rendering, upload, and management."""
import logging
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession, get_profile_with_access
from app.models.draft import Draft
from app.models.media_asset import MediaAsset, MediaAssetType
from app.models.visual_template import VisualTemplate
from app.schemas.media import (
    ImageGenerateRequest,
    ImageRenderRequest,
    ImageUploadResponse,
    MediaAssetResponse,
)
from app.services.image_generation_service import get_image_generation_service
from app.services.storage_service import get_storage_service
from app.services.template_renderer_service import get_template_renderer

logger = logging.getLogger(__name__)
router = APIRouter()


async def _verify_draft_access(draft_id: UUID, current_user, db) -> Draft:
    """Load draft and verify user has access."""
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found",
        )
    await get_profile_with_access(draft.profile_id, current_user, db)
    return draft


@router.post("/render", response_model=ImageUploadResponse)
async def render_template_image(
    request: ImageRenderRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Render an image from a visual template with variable values."""
    draft = await _verify_draft_access(request.draft_id, current_user, db)

    # Load the template
    result = await db.execute(
        select(VisualTemplate).where(VisualTemplate.id == request.template_id)
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
            detail="Template has no HTML content for server-side rendering",
        )

    # Render HTML → PNG
    renderer = await get_template_renderer()
    dimensions = template.dimensions or {"width": 1080, "height": 1080}
    png_bytes = await renderer.render_template(
        html_template=template.html_template,
        variables=request.variables,
        width=dimensions.get("width", 1080),
        height=dimensions.get("height", 1080),
        brand_overrides=request.brand_overrides,
    )

    # Upload to S3
    storage = get_storage_service()
    url, key = await storage.upload_image(
        file_bytes=png_bytes,
        content_type="image/png",
        prefix=f"media/{draft.profile_id}",
    )

    # Create media asset record
    asset = MediaAsset(
        draft_id=draft.id,
        type=MediaAssetType.IMAGE,
        storage_url=url,
        storage_key=key,
        visual_template_id=template.id,
        metadata_json={
            "width": dimensions.get("width", 1080),
            "height": dimensions.get("height", 1080),
            "format": "png",
            "source": "template_render",
        },
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return ImageUploadResponse(
        media_asset=MediaAssetResponse.model_validate(asset),
        message="Image rendered from template",
    )


@router.post("/generate", response_model=ImageUploadResponse)
async def generate_ai_image(
    request: ImageGenerateRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Generate an AI image using Gemini Imagen 3."""
    draft = await _verify_draft_access(request.draft_id, current_user, db)

    # Build prompt — auto-generate from draft content if not provided
    image_gen = get_image_generation_service()
    prompt = request.prompt
    if not prompt:
        # Auto-generate prompt from draft content
        content = f"{draft.hook}\n\n{draft.body}"
        prompt = await image_gen.generate_image_prompt(content)

    # Generate image
    png_bytes = await image_gen.generate_image(
        prompt=prompt,
        style=request.style,
        width=request.width,
        height=request.height,
    )

    # Upload to S3
    storage = get_storage_service()
    url, key = await storage.upload_image(
        file_bytes=png_bytes,
        content_type="image/png",
        prefix=f"media/{draft.profile_id}",
    )

    # Create media asset record
    asset = MediaAsset(
        draft_id=draft.id,
        type=MediaAssetType.IMAGE,
        storage_url=url,
        storage_key=key,
        generation_prompt=prompt,
        metadata_json={
            "width": request.width,
            "height": request.height,
            "format": "png",
            "source": "ai_generation",
            "style": request.style,
        },
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return ImageUploadResponse(
        media_asset=MediaAssetResponse.model_validate(asset),
        message="Image generated with AI",
    )


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    draft_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(...),
    alt_text: str | None = None,
    slide_index: int | None = None,
):
    """Upload a user-provided image and attach to a draft."""
    draft = await _verify_draft_access(draft_id, current_user, db)

    # Validate file type
    allowed_types = {"image/png", "image/jpeg", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {', '.join(allowed_types)}",
        )

    # Read and upload
    file_bytes = await file.read()
    storage = get_storage_service()
    url, key = await storage.upload_image(
        file_bytes=file_bytes,
        content_type=file.content_type or "image/png",
        prefix=f"media/{draft.profile_id}",
    )

    # Determine asset type
    asset_type = MediaAssetType.CAROUSEL_SLIDE if slide_index is not None else MediaAssetType.IMAGE

    asset = MediaAsset(
        draft_id=draft.id,
        type=asset_type,
        storage_url=url,
        storage_key=key,
        alt_text=alt_text,
        slide_index=slide_index,
        metadata_json={
            "format": (file.content_type or "image/png").split("/")[-1],
            "source": "user_upload",
            "original_filename": file.filename,
            "file_size": len(file_bytes),
        },
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return ImageUploadResponse(
        media_asset=MediaAssetResponse.model_validate(asset),
        message="Image uploaded successfully",
    )


@router.get("/draft/{draft_id}", response_model=list[MediaAssetResponse])
async def list_draft_media(
    draft_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """List all media assets for a draft."""
    await _verify_draft_access(draft_id, current_user, db)

    result = await db.execute(
        select(MediaAsset)
        .where(MediaAsset.draft_id == draft_id)
        .order_by(MediaAsset.slide_index.asc().nullsfirst(), MediaAsset.created_at.asc())
    )
    assets = result.scalars().all()
    return [MediaAssetResponse.model_validate(a) for a in assets]


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media_asset(
    asset_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """Delete a media asset and its S3 object."""
    result = await db.execute(
        select(MediaAsset).where(MediaAsset.id == asset_id)
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media asset not found",
        )

    # Verify access through the draft
    await _verify_draft_access(asset.draft_id, current_user, db)

    # Delete from S3
    storage = get_storage_service()
    await storage.delete_image(asset.storage_key)

    # Delete from DB
    await db.delete(asset)
    await db.commit()
