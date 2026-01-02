"""
BrandScale AI - Assets Routes
Asset management, editing, and download endpoints.
"""
import io
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Platform
from app.database import get_db
from app.models.generated_asset import GeneratedAsset
from app.models.user import User
from app.schemas.asset import (
    AssetListResponse,
    AssetResponse,
    AssetUpdate,
    DownloadRequest,
)
from app.utils.auth import get_current_active_user
from app.utils.s3 import s3_client


router = APIRouter(prefix="/api/assets", tags=["Assets"])


@router.get("", response_model=AssetListResponse)
async def list_assets(
    platform: Optional[Platform] = None,
    profile_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List user's generated assets with filters.
    """
    # Build query
    conditions = [GeneratedAsset.user_id == current_user.id]
    
    if platform:
        conditions.append(GeneratedAsset.platform == platform)
    if profile_id:
        conditions.append(GeneratedAsset.profile_id == profile_id)
    if status:
        conditions.append(GeneratedAsset.status == status)
    if date_from:
        conditions.append(GeneratedAsset.created_at >= date_from)
    if date_to:
        conditions.append(GeneratedAsset.created_at <= date_to)
    
    # Count total
    count_stmt = select(func.count(GeneratedAsset.id)).where(and_(*conditions))
    total = (await db.execute(count_stmt)).scalar() or 0
    
    # Fetch page
    offset = (page - 1) * page_size
    stmt = (
        select(GeneratedAsset)
        .where(and_(*conditions))
        .order_by(GeneratedAsset.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    
    assets = (await db.execute(stmt)).scalars().all()
    
    return AssetListResponse(
        assets=[AssetResponse.model_validate(a) for a in assets],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific asset by ID.
    """
    stmt = select(GeneratedAsset).where(
        GeneratedAsset.id == asset_id,
        GeneratedAsset.user_id == current_user.id
    )
    asset = (await db.execute(stmt)).scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    return AssetResponse.model_validate(asset)


@router.post("/{asset_id}/edit", response_model=AssetResponse)
async def edit_asset(
    asset_id: int,
    update_data: AssetUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Quick edit asset copy (headline, CTA, etc).
    Note: This updates copy text only, not the rendered image.
    Use regenerate to create a new image with updated copy.
    """
    stmt = select(GeneratedAsset).where(
        GeneratedAsset.id == asset_id,
        GeneratedAsset.user_id == current_user.id
    )
    asset = (await db.execute(stmt)).scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # Update copy text
    asset.update_copy(
        headline=update_data.headline,
        subheadline=update_data.subheadline,
        body=update_data.body,
        cta=update_data.cta,
        hashtags=update_data.hashtags
    )
    
    await db.commit()
    await db.refresh(asset)
    
    return AssetResponse.model_validate(asset)


@router.post("/{asset_id}/regenerate", response_model=dict)
async def regenerate_asset(
    asset_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Re-render an asset with its current copy text.
    Useful after editing copy to generate new image.
    """
    from app.config import AspectRatio
    from app.workers.tasks import render_job
    
    stmt = select(GeneratedAsset).where(
        GeneratedAsset.id == asset_id,
        GeneratedAsset.user_id == current_user.id
    )
    asset = (await db.execute(stmt)).scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    if not asset.template_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset has no associated template"
        )
    
    # Queue render job
    task = render_job.delay(
        template_id=asset.template_id,
        data=asset.copy_text,
        aspect_ratios=[asset.aspect_ratio],
        user_id=current_user.id,
        profile_id=asset.profile_id,
        asset_id=asset.id
    )
    
    # Update status
    asset.status = "processing"
    await db.commit()
    
    return {
        "job_id": task.id,
        "asset_id": asset.id,
        "message": "Regeneration job queued"
    }


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an asset.
    """
    stmt = select(GeneratedAsset).where(
        GeneratedAsset.id == asset_id,
        GeneratedAsset.user_id == current_user.id
    )
    asset = (await db.execute(stmt)).scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # Delete from S3
    if asset.image_url:
        await s3_client.delete_object(asset.get_s3_key())
    
    # Delete from database
    await db.delete(asset)
    await db.commit()


@router.post("/download")
async def download_assets(
    request: DownloadRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate ZIP of selected assets for download.
    Returns a presigned URL for the ZIP file.
    """
    # Verify all assets belong to user
    stmt = select(GeneratedAsset).where(
        GeneratedAsset.id.in_(request.asset_ids),
        GeneratedAsset.user_id == current_user.id
    )
    assets = (await db.execute(stmt)).scalars().all()
    
    if len(assets) != len(request.asset_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some assets not found or not accessible"
        )
    
    # Collect S3 keys
    keys = []
    for asset in assets:
        if asset.image_url:
            keys.append(asset.get_s3_key())
    
    if not keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No images available for download"
        )
    
    # Create ZIP archive
    archive_key = f"{current_user.id}/downloads/assets_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"
    
    try:
        download_url = await s3_client.create_zip_archive(keys, archive_key)
        
        return {
            "download_url": download_url,
            "asset_count": len(keys),
            "expires_in": 3600,  # 1 hour
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create download archive: {str(e)}"
        )


@router.get("/{asset_id}/copy-text")
async def get_asset_copy_text(
    asset_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get formatted copy text for an asset.
    Useful for copying to clipboard.
    """
    stmt = select(GeneratedAsset).where(
        GeneratedAsset.id == asset_id,
        GeneratedAsset.user_id == current_user.id
    )
    asset = (await db.execute(stmt)).scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    copy = asset.copy_text
    hashtags = " ".join(copy.get("hashtags", []))
    
    formatted = f"""{copy.get('headline', '')}

{copy.get('subheadline', '')}

{copy.get('body', '')}

{copy.get('cta', '')}

{hashtags}""".strip()
    
    return {
        "formatted": formatted,
        "raw": copy,
    }
