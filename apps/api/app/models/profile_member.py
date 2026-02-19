"""Profile membership model for workspace access."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MemberRole(str, PyEnum):
    """Role within a profile workspace."""
    OWNER = "owner"
    MEMBER = "member"


class MemberStatus(str, PyEnum):
    """Invitation/membership status."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class ProfileMember(Base):
    """Links users to profiles as workspace members."""

    __tablename__ = "profile_members"
    __table_args__ = (
        UniqueConstraint("profile_id", "user_id", name="uq_profile_member_user"),
        UniqueConstraint("profile_id", "invited_email", name="uq_profile_member_email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="member_role", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MemberRole.MEMBER,
    )
    status: Mapped[MemberStatus] = mapped_column(
        Enum(MemberStatus, name="member_status", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MemberStatus.PENDING,
    )
    invited_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    profile: Mapped["Profile"] = relationship("Profile", back_populates="members")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="memberships")
    invited_by: Mapped["User"] = relationship("User", foreign_keys=[invited_by_id])

    def __repr__(self) -> str:
        return f"<ProfileMember profile={self.profile_id} user={self.user_id} role={self.role}>"
