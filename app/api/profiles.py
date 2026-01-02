"""
BrandScale AI - Profile Routes
Brand profile management endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import ProfileType
from app.database import get_db
from app.models.brand_profile import BrandProfile
from app.models.user import User
from app.schemas.brand_profile import (
    BrandProfileListResponse,
    BrandProfileResponse,
    BrandProfileUpdate,
)
from app.utils.auth import get_current_active_user


router = APIRouter(prefix="/api/profiles", tags=["Profiles"])


@router.get("", response_model=BrandProfileListResponse)
async def list_profiles(
    profile_type: Optional[ProfileType] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List user's brand profiles.
    """
    conditions = [BrandProfile.user_id == current_user.id]
    
    if profile_type:
        conditions.append(BrandProfile.profile_type == profile_type)
    
    # Count total
    count_stmt = select(func.count(BrandProfile.id)).where(and_(*conditions))
    total = (await db.execute(count_stmt)).scalar() or 0
    
    # Fetch page
    offset = (page - 1) * page_size
    stmt = (
        select(BrandProfile)
        .where(and_(*conditions))
        .order_by(BrandProfile.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    
    profiles = (await db.execute(stmt)).scalars().all()
    
    return BrandProfileListResponse(
        profiles=[BrandProfileResponse.model_validate(p) for p in profiles],
        total=total
    )


@router.get("/{profile_id}", response_model=BrandProfileResponse)
async def get_profile(
    profile_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific brand profile.
    """
    stmt = select(BrandProfile).where(
        BrandProfile.id == profile_id,
        BrandProfile.user_id == current_user.id
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return BrandProfileResponse.model_validate(profile)


@router.put("/{profile_id}", response_model=BrandProfileResponse)
async def update_profile(
    profile_id: int,
    update_data: BrandProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a brand profile.
    """
    stmt = select(BrandProfile).where(
        BrandProfile.id == profile_id,
        BrandProfile.user_id == current_user.id
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Update fields
    if update_data.name is not None:
        profile.name = update_data.name
    
    if update_data.brand_assets is not None:
        # Merge with existing
        existing = profile.brand_assets or {}
        existing.update(update_data.brand_assets)
        profile.brand_assets = existing
    
    if update_data.voice_profile is not None:
        existing = profile.voice_profile or {}
        existing.update(update_data.voice_profile)
        profile.voice_profile = existing
    
    await db.commit()
    await db.refresh(profile)
    
    return BrandProfileResponse.model_validate(profile)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a brand profile and all associated assets.
    """
    stmt = select(BrandProfile).where(
        BrandProfile.id == profile_id,
        BrandProfile.user_id == current_user.id
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Delete profile (cascade deletes assets)
    await db.delete(profile)
    await db.commit()


@router.get("/{profile_id}/assets-summary")
async def get_profile_assets_summary(
    profile_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get summary of assets for a profile.
    """
    from app.models.generated_asset import GeneratedAsset
    
    # Verify profile access
    stmt = select(BrandProfile).where(
        BrandProfile.id == profile_id,
        BrandProfile.user_id == current_user.id
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Count by status
    status_stmt = (
        select(GeneratedAsset.status, func.count(GeneratedAsset.id))
        .where(GeneratedAsset.profile_id == profile_id)
        .group_by(GeneratedAsset.status)
    )
    status_counts = dict((await db.execute(status_stmt)).all())
    
    # Count by platform
    platform_stmt = (
        select(GeneratedAsset.platform, func.count(GeneratedAsset.id))
        .where(GeneratedAsset.profile_id == profile_id)
        .group_by(GeneratedAsset.platform)
    )
    platform_counts = dict((await db.execute(platform_stmt)).all())
    
    return {
        "profile_id": profile_id,
        "total_assets": sum(status_counts.values()),
        "by_status": status_counts,
        "by_platform": {str(k): v for k, v in platform_counts.items()},
    }


@router.get("/{profile_id}/context")
async def get_profile_context(
    profile_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get brand context for AI generation.
    Used to understand what data is available for copy generation.
    """
    stmt = select(BrandProfile).where(
        BrandProfile.id == profile_id,
        BrandProfile.user_id == current_user.id
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return {
        "profile_id": profile_id,
        "context": profile.get_brand_context(),
        "has_logo": profile.logo_url is not None,
        "has_products": len(profile.products) > 0,
        "primary_color": profile.primary_color,
        "voice_tone": profile.tone,
    }
