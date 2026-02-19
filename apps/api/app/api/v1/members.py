"""Membership and invitation endpoints."""
import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession, get_profile_with_access
from app.models.profile import Profile
from app.models.profile_member import ProfileMember, MemberRole, MemberStatus
from app.models.user import User
from app.schemas.membership import (
    InvitationResponse,
    InvitationsListResponse,
    InviteMemberRequest,
    MemberResponse,
    MembersListResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _member_response(member: ProfileMember, user: User | None = None) -> MemberResponse:
    """Build MemberResponse from a ProfileMember and optional User."""
    return MemberResponse(
        id=member.id,
        profile_id=member.profile_id,
        user_id=member.user_id,
        role=member.role.value,
        status=member.status.value,
        invited_email=member.invited_email,
        user_name=user.name if user else None,
        user_email=user.email if user else None,
        created_at=member.created_at,
    )


@router.post("/profiles/{profile_id}/members/invite", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def invite_member(
    profile_id: UUID,
    invite_data: InviteMemberRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> MemberResponse:
    """Invite a member to a profile workspace. Owner only."""
    _, _ = await get_profile_with_access(profile_id, current_user, db, require_owner=True)

    email = invite_data.email.lower()

    # Can't invite yourself
    if email == current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot invite yourself",
        )

    # Check if already a member or pending invite
    existing = await db.execute(
        select(ProfileMember).where(
            ProfileMember.profile_id == profile_id,
            (ProfileMember.invited_email == email) | (
                ProfileMember.user_id.in_(
                    select(User.id).where(User.email == email)
                )
            ),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already a member or has a pending invitation",
        )

    # Check if a user with this email exists
    user_result = await db.execute(select(User).where(User.email == email))
    existing_user = user_result.scalar_one_or_none()

    member = ProfileMember(
        profile_id=profile_id,
        user_id=existing_user.id if existing_user else None,
        role=MemberRole.MEMBER,
        status=MemberStatus.PENDING,
        invited_email=email,
        invited_by_id=current_user.id,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    logger.info(f"User {current_user.id} invited {email} to profile {profile_id}")

    return _member_response(member, existing_user)


@router.get("/profiles/{profile_id}/members", response_model=MembersListResponse)
async def list_members(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> MembersListResponse:
    """List all members and pending invites for a profile. Any member can view."""
    await get_profile_with_access(profile_id, current_user, db)

    result = await db.execute(
        select(ProfileMember)
        .where(ProfileMember.profile_id == profile_id)
        .order_by(ProfileMember.created_at)
    )
    members = result.scalars().all()

    # Load users for members that have user_id
    user_ids = [m.user_id for m in members if m.user_id]
    users_map = {}
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_map = {u.id: u for u in users_result.scalars().all()}

    return MembersListResponse(
        members=[_member_response(m, users_map.get(m.user_id)) for m in members],
        total=len(members),
    )


@router.delete("/profiles/{profile_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    profile_id: UUID,
    member_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    """Remove a member from a profile. Owner only. Cannot remove self."""
    _, _ = await get_profile_with_access(profile_id, current_user, db, require_owner=True)

    result = await db.execute(
        select(ProfileMember).where(
            ProfileMember.id == member_id,
            ProfileMember.profile_id == profile_id,
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    if member.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself from your own profile",
        )

    await db.delete(member)
    await db.commit()

    logger.info(f"Owner {current_user.id} removed member {member_id} from profile {profile_id}")


@router.post("/profiles/{profile_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    """Leave a profile workspace. Members only (owners cannot leave)."""
    _, membership = await get_profile_with_access(profile_id, current_user, db)

    if membership.role == MemberRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owners cannot leave their own profile. Transfer ownership or delete the profile instead.",
        )

    await db.delete(membership)
    await db.commit()

    logger.info(f"User {current_user.id} left profile {profile_id}")


# ============================================================================
# Invitations (from the invitee's perspective)
# ============================================================================

@router.get("/invitations", response_model=InvitationsListResponse)
async def list_invitations(
    current_user: CurrentUser,
    db: DBSession,
) -> InvitationsListResponse:
    """List pending invitations for the current user."""
    result = await db.execute(
        select(ProfileMember)
        .where(
            ProfileMember.user_id == current_user.id,
            ProfileMember.status == MemberStatus.PENDING,
        )
        .order_by(ProfileMember.created_at.desc())
    )
    pending = result.scalars().all()

    # Also check by email for invites sent before user had an account
    email_result = await db.execute(
        select(ProfileMember)
        .where(
            ProfileMember.invited_email == current_user.email.lower(),
            ProfileMember.status == MemberStatus.PENDING,
            ProfileMember.user_id.is_(None),
        )
    )
    email_pending = email_result.scalars().all()

    all_pending = list(pending) + list(email_pending)

    # Load profile names and inviter names
    profile_ids = [m.profile_id for m in all_pending]
    inviter_ids = [m.invited_by_id for m in all_pending if m.invited_by_id]

    profiles_map = {}
    if profile_ids:
        profiles_result = await db.execute(select(Profile).where(Profile.id.in_(profile_ids)))
        profiles_map = {p.id: p for p in profiles_result.scalars().all()}

    inviters_map = {}
    if inviter_ids:
        inviters_result = await db.execute(select(User).where(User.id.in_(inviter_ids)))
        inviters_map = {u.id: u for u in inviters_result.scalars().all()}

    invitations = []
    for m in all_pending:
        profile = profiles_map.get(m.profile_id)
        inviter = inviters_map.get(m.invited_by_id) if m.invited_by_id else None
        invitations.append(InvitationResponse(
            id=m.id,
            profile_id=m.profile_id,
            profile_name=profile.name if profile else "Unknown",
            role=m.role.value,
            invited_by_name=inviter.name if inviter else None,
            created_at=m.created_at,
        ))

    return InvitationsListResponse(invitations=invitations, total=len(invitations))


@router.post("/invitations/{invitation_id}/accept", status_code=status.HTTP_200_OK)
async def accept_invitation(
    invitation_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    """Accept a pending invitation."""
    result = await db.execute(
        select(ProfileMember).where(
            ProfileMember.id == invitation_id,
            ProfileMember.status == MemberStatus.PENDING,
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    # Verify this invitation belongs to the current user
    is_by_user_id = member.user_id == current_user.id
    is_by_email = member.invited_email and member.invited_email.lower() == current_user.email.lower()
    if not is_by_user_id and not is_by_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is not for you",
        )

    member.status = MemberStatus.ACCEPTED
    member.user_id = current_user.id  # Link user_id for email-based invites
    await db.commit()

    logger.info(f"User {current_user.id} accepted invitation {invitation_id}")

    return {"message": "Invitation accepted"}


@router.post("/invitations/{invitation_id}/decline", status_code=status.HTTP_200_OK)
async def decline_invitation(
    invitation_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    """Decline a pending invitation."""
    result = await db.execute(
        select(ProfileMember).where(
            ProfileMember.id == invitation_id,
            ProfileMember.status == MemberStatus.PENDING,
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    # Verify this invitation belongs to the current user
    is_by_user_id = member.user_id == current_user.id
    is_by_email = member.invited_email and member.invited_email.lower() == current_user.email.lower()
    if not is_by_user_id and not is_by_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is not for you",
        )

    member.status = MemberStatus.DECLINED
    await db.commit()

    logger.info(f"User {current_user.id} declined invitation {invitation_id}")

    return {"message": "Invitation declined"}
