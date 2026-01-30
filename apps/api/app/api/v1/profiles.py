"""Profile endpoints."""
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.profile import Profile, ProfileSource
from app.models.identity import IdentityGraph, StyleProfile
from app.schemas.profile import (
    ProfileCreate,
    ProfileListResponse,
    ProfileResponse,
    ProfileUpdate,
)

router = APIRouter()


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_data: ProfileCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileResponse:
    """Create a new profile."""
    # Create profile
    profile = Profile(
        user_id=current_user.id,
        name=profile_data.name,
        type=profile_data.type,
        description=profile_data.description,
    )
    db.add(profile)
    await db.flush()

    # Create sources if provided
    if profile_data.sources:
        sources = ProfileSource(
            profile_id=profile.id,
            linkedin_url=profile_data.sources.linkedin_url,
            website_url=profile_data.sources.website_url,
            manual_text=profile_data.sources.manual_text,
            rss_urls=profile_data.sources.rss_urls,
        )
        db.add(sources)

    # Create empty identity graph
    identity_graph = IdentityGraph(profile_id=profile.id)
    db.add(identity_graph)

    # Create default style profile
    style_profile = StyleProfile(profile_id=profile.id)
    db.add(style_profile)

    await db.commit()
    await db.refresh(profile)

    # Reload with relationships
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.sources))
        .where(Profile.id == profile.id)
    )
    profile = result.scalar_one()

    return ProfileResponse.model_validate(profile)


@router.get("", response_model=ProfileListResponse)
async def list_profiles(
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileListResponse:
    """List all profiles for current user."""
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.sources))
        .where(Profile.user_id == current_user.id)
        .order_by(Profile.created_at.desc())
    )
    profiles = result.scalars().all()

    return ProfileListResponse(
        profiles=[ProfileResponse.model_validate(p) for p in profiles],
        total=len(profiles),
    )


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileResponse:
    """Get a specific profile."""
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.sources))
        .where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return ProfileResponse.model_validate(profile)


@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: UUID,
    profile_data: ProfileUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> ProfileResponse:
    """Update a profile."""
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.sources))
        .where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    # Update fields
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)

    return ProfileResponse.model_validate(profile)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    """Delete a profile."""
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    await db.delete(profile)
    await db.commit()

