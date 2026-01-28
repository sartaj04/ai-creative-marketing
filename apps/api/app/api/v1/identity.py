"""Identity graph and style profile endpoints."""
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.profile import Profile
from app.models.identity import IdentityGraph, StyleProfile
from app.schemas.identity import (
    IdentityGraphResponse,
    IdentityGraphUpdate,
    StyleProfileResponse,
    StyleProfileUpdate,
)

router = APIRouter()


@router.get("/profiles/{profile_id}/identity-graph", response_model=IdentityGraphResponse)
async def get_identity_graph(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> IdentityGraphResponse:
    """Get identity graph for a profile."""
    # Verify profile ownership
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    result = await db.execute(
        select(IdentityGraph).where(IdentityGraph.profile_id == profile_id)
    )
    identity_graph = result.scalar_one_or_none()

    if not identity_graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity graph not found",
        )

    return IdentityGraphResponse.model_validate(identity_graph)


@router.put("/profiles/{profile_id}/identity-graph", response_model=IdentityGraphResponse)
async def update_identity_graph(
    profile_id: UUID,
    update_data: IdentityGraphUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> IdentityGraphResponse:
    """Update identity graph for a profile."""
    # Verify profile ownership
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    result = await db.execute(
        select(IdentityGraph).where(IdentityGraph.profile_id == profile_id)
    )
    identity_graph = result.scalar_one_or_none()

    if not identity_graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity graph not found",
        )

    # Update fields
    data = update_data.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(identity_graph, field, value)

    # Increment version
    identity_graph.version += 1

    await db.commit()
    await db.refresh(identity_graph)

    return IdentityGraphResponse.model_validate(identity_graph)


@router.get("/profiles/{profile_id}/style-profile", response_model=StyleProfileResponse)
async def get_style_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> StyleProfileResponse:
    """Get style profile for a profile."""
    # Verify profile ownership
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    result = await db.execute(
        select(StyleProfile).where(StyleProfile.profile_id == profile_id)
    )
    style_profile = result.scalar_one_or_none()

    if not style_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Style profile not found",
        )

    return StyleProfileResponse.model_validate(style_profile)


@router.put("/profiles/{profile_id}/style-profile", response_model=StyleProfileResponse)
async def update_style_profile(
    profile_id: UUID,
    update_data: StyleProfileUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> StyleProfileResponse:
    """Update style profile for a profile."""
    # Verify profile ownership
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    result = await db.execute(
        select(StyleProfile).where(StyleProfile.profile_id == profile_id)
    )
    style_profile = result.scalar_one_or_none()

    if not style_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Style profile not found",
        )

    # Update fields
    data = update_data.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is not None:
            setattr(style_profile, field, value)

    # Increment version
    style_profile.version += 1

    await db.commit()
    await db.refresh(style_profile)

    return StyleProfileResponse.model_validate(style_profile)
