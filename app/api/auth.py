"""
BrandScale AI - Authentication Routes
User registration, login, and JWT token management.
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserLogin, UserResponse, UserUpdate
from app.utils.auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_password_hash,
    get_user_by_email,
)


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user account.
    
    Returns JWT token for immediate authentication.
    """
    # Check if email already exists
    existing_user = await get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        segment=user_data.segment
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Generate token
    access_token = create_access_token(
        user_id=user.id,
        email=user.email,
        tier=user.tier,
        expires_delta=timedelta(hours=settings.jwt_expiration_hours)
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expiration_hours * 3600,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user and return JWT token.
    """
    user = await authenticate_user(db, credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Reset usage counter if needed
    user.reset_usage_if_needed()
    await db.commit()
    
    # Generate token
    access_token = create_access_token(
        user_id=user.id,
        email=user.email,
        tier=user.tier,
        expires_delta=timedelta(hours=settings.jwt_expiration_hours)
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expiration_hours * 3600,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current authenticated user's profile.
    """
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user's profile.
    """
    if update_data.segment is not None:
        current_user.segment = update_data.segment
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: User = Depends(get_current_active_user)
):
    """
    Refresh JWT token for authenticated user.
    """
    access_token = create_access_token(
        user_id=current_user.id,
        email=current_user.email,
        tier=current_user.tier,
        expires_delta=timedelta(hours=settings.jwt_expiration_hours)
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expiration_hours * 3600,
        user=UserResponse.model_validate(current_user)
    )


@router.get("/usage")
async def get_usage(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user's usage statistics.
    """
    from app.config import TIER_LIMITS
    from app.utils.rate_limiter import rate_limiter
    
    limit = TIER_LIMITS.get(current_user.tier, 0)
    remaining = await rate_limiter.get_remaining(
        current_user.id,
        current_user.tier,
        "generate"
    )
    
    return {
        "tier": current_user.tier.value,
        "usage_count": current_user.usage_count,
        "limit": limit if limit != -1 else "unlimited",
        "remaining": remaining if remaining != -1 else "unlimited",
        "reset_date": current_user.usage_reset_date.isoformat(),
    }
