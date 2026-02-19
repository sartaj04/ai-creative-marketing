"""API dependencies for dependency injection."""
from typing import Annotated, AsyncGenerator
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import async_session_maker
from app.core.security import decode_access_token
from app.models.user import User
from app.models.profile import Profile
from app.models.profile_member import ProfileMember, MemberRole, MemberStatus

# Security scheme
security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


# Type aliases for cleaner annotations
DBSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_admin_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Require admin user for protected endpoints."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


AdminUser = Annotated[User, Depends(get_admin_user)]


async def get_profile_with_access(
    profile_id: UUID,
    current_user: User,
    db: AsyncSession,
    require_owner: bool = False,
) -> tuple[Profile, ProfileMember]:
    """Verify the current user has access to the profile via membership.

    Returns the (Profile, ProfileMember) tuple.
    Raises 404 if no profile or no accepted membership.
    Raises 403 if require_owner=True and role is not OWNER.
    """
    result = await db.execute(
        select(Profile, ProfileMember)
        .join(ProfileMember, ProfileMember.profile_id == Profile.id)
        .where(
            Profile.id == profile_id,
            ProfileMember.user_id == current_user.id,
            ProfileMember.status == MemberStatus.ACCEPTED,
        )
        .options(selectinload(Profile.sources))
    )
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    profile, membership = row.tuple()

    if require_owner and membership.role != MemberRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required",
        )

    return profile, membership


async def get_user_profile_ids(
    current_user: User,
    db: AsyncSession,
) -> list[UUID]:
    """Get all profile IDs the current user has accepted membership for."""
    result = await db.execute(
        select(ProfileMember.profile_id).where(
            ProfileMember.user_id == current_user.id,
            ProfileMember.status == MemberStatus.ACCEPTED,
        )
    )
    return list(result.scalars().all())
