"""
Generated assets API endpoints.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.generated_asset import GeneratedAsset, Platform
from app.schemas.generation import AssetGenerationResponse
from app.core.auth import get_current_user


router = APIRouter()


@router.get("/", response_model=List[AssetGenerationResponse])
async def list_assets(
    profile_id: Optional[UUID] = None,
    platform: Optional[Platform] = None,
    is_favorite: Optional[bool] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List generated assets with optional filters.
    """
    query = select(GeneratedAsset).where(GeneratedAsset.user_id == current_user.id)
    
    if profile_id:
        query = query.where(GeneratedAsset.profile_id == profile_id)
    if platform:
        query = query.where(GeneratedAsset.platform == platform)
    if is_favorite is not None:
        query = query.where(GeneratedAsset.is_favorite == is_favorite)
    
    query = query.order_by(GeneratedAsset.created_at.desc()).offset(offset).limit(limit)
    
    result = await db.execute(query)
    assets = result.scalars().all()
    
    return assets


@router.get("/{asset_id}", response_model=AssetGenerationResponse)
async def get_asset(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific generated asset.
    """
    result = await db.execute(
        select(GeneratedAsset)
        .where(
            GeneratedAsset.id == asset_id,
            GeneratedAsset.user_id == current_user.id
        )
    )
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    return asset


@router.patch("/{asset_id}/favorite")
async def toggle_favorite(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle favorite status of an asset.
    """
    result = await db.execute(
        select(GeneratedAsset)
        .where(
            GeneratedAsset.id == asset_id,
            GeneratedAsset.user_id == current_user.id
        )
    )
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    asset.is_favorite = not asset.is_favorite
    await db.commit()
    
    return {"is_favorite": asset.is_favorite}


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a generated asset.
    """
    result = await db.execute(
        select(GeneratedAsset)
        .where(
            GeneratedAsset.id == asset_id,
            GeneratedAsset.user_id == current_user.id
        )
    )
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # TODO: Also delete from S3
    await db.delete(asset)
    await db.commit()


@router.post("/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_assets(
    asset_ids: List[UUID],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete multiple assets at once.
    """
    for asset_id in asset_ids:
        result = await db.execute(
            select(GeneratedAsset)
            .where(
                GeneratedAsset.id == asset_id,
                GeneratedAsset.user_id == current_user.id
            )
        )
        asset = result.scalar_one_or_none()
        if asset:
            await db.delete(asset)
    
    await db.commit()


@router.get("/download/{asset_id}")
async def get_download_url(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a download URL for an asset.
    """
    result = await db.execute(
        select(GeneratedAsset)
        .where(
            GeneratedAsset.id == asset_id,
            GeneratedAsset.user_id == current_user.id
        )
    )
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    if not asset.image_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset has no image"
        )
    
    # Mark as downloaded
    asset.is_downloaded = True
    await db.commit()
    
    # TODO: Generate presigned S3 URL
    return {"download_url": asset.image_url}


@router.post("/bulk-download")
async def get_bulk_download_url(
    asset_ids: List[UUID],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a ZIP file with multiple assets and return download URL.
    """
    # Verify all assets belong to user
    result = await db.execute(
        select(GeneratedAsset)
        .where(
            GeneratedAsset.id.in_(asset_ids),
            GeneratedAsset.user_id == current_user.id
        )
    )
    assets = result.scalars().all()
    
    if len(assets) != len(asset_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some assets not found"
        )
    
    # TODO: Create ZIP and upload to S3, return presigned URL
    return {
        "message": "ZIP generation started",
        "asset_count": len(assets)
    }
