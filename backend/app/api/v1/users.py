"""
User management API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.core.auth import get_current_user


router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        tier=current_user.tier,
        segment=current_user.segment,
        usage_count=current_user.usage_count,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        usage_limit=current_user.usage_limit,
        can_generate=current_user.can_generate
    )


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user profile.
    """
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.segment is not None:
        current_user.segment = user_update.segment
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        tier=current_user.tier,
        segment=current_user.segment,
        usage_count=current_user.usage_count,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        usage_limit=current_user.usage_limit,
        can_generate=current_user.can_generate
    )


@router.get("/usage")
async def get_usage_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's usage statistics.
    """
    return {
        "tier": current_user.tier.value,
        "usage_count": current_user.usage_count,
        "usage_limit": current_user.usage_limit,
        "can_generate": current_user.can_generate,
        "remaining": current_user.usage_limit - current_user.usage_count if current_user.usage_limit > 0 else "unlimited"
    }
