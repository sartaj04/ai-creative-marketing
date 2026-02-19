"""Membership schemas for profile workspace invitations and members."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class InviteMemberRequest(BaseModel):
    """Request to invite a member by email."""
    email: EmailStr


class MemberResponse(BaseModel):
    """Response for a single membership entry."""
    id: UUID
    profile_id: UUID
    user_id: Optional[UUID] = None
    role: str
    status: str
    invited_email: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MembersListResponse(BaseModel):
    """Response for listing members of a profile."""
    members: list[MemberResponse]
    total: int


class InvitationResponse(BaseModel):
    """Response for a pending invitation from the invitee's perspective."""
    id: UUID
    profile_id: UUID
    profile_name: str
    role: str
    invited_by_name: Optional[str] = None
    created_at: datetime


class InvitationsListResponse(BaseModel):
    """Response for listing a user's pending invitations."""
    invitations: list[InvitationResponse]
    total: int
