"""
Brand profile API endpoints.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.brand_profile import BrandProfile
from app.schemas.brand_profile import (
    BrandProfileCreate,
    BrandProfileUpdate,
    BrandProfileResponse,
)
from app.core.auth import get_current_user


router = APIRouter()


@router.get("/", response_model=List[BrandProfileResponse])
async def list_brand_profiles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all brand profiles for the current user.
    """
    result = await db.execute(
        select(BrandProfile)
        .where(BrandProfile.user_id == current_user.id)
        .order_by(BrandProfile.created_at.desc())
    )
    profiles = result.scalars().all()
    return profiles


@router.post("/", response_model=BrandProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_brand_profile(
    profile_data: BrandProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new brand profile.
    """
    profile = BrandProfile(
        user_id=current_user.id,
        profile_type=profile_data.profile_type,
        name=profile_data.name,
        description=profile_data.description,
        website_url=profile_data.website_url,
        industry=profile_data.industry,
        target_audience=profile_data.target_audience,
        brand_assets=profile_data.brand_assets or {},
        voice_profile=profile_data.voice_profile or {}
    )
    
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    
    return profile


@router.get("/{profile_id}", response_model=BrandProfileResponse)
async def get_brand_profile(
    profile_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific brand profile.
    """
    result = await db.execute(
        select(BrandProfile)
        .where(
            BrandProfile.id == profile_id,
            BrandProfile.user_id == current_user.id
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand profile not found"
        )
    
    return profile


@router.patch("/{profile_id}", response_model=BrandProfileResponse)
async def update_brand_profile(
    profile_id: UUID,
    profile_update: BrandProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a brand profile.
    """
    result = await db.execute(
        select(BrandProfile)
        .where(
            BrandProfile.id == profile_id,
            BrandProfile.user_id == current_user.id
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand profile not found"
        )
    
    # Update fields if provided
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    await db.commit()
    await db.refresh(profile)
    
    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand_profile(
    profile_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a brand profile.
    """
    result = await db.execute(
        select(BrandProfile)
        .where(
            BrandProfile.id == profile_id,
            BrandProfile.user_id == current_user.id
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand profile not found"
        )
    
    await db.delete(profile)
    await db.commit()
