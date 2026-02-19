"""add_profile_members

Revision ID: b2c3d4e5f6a7
Revises: fd9a1b2c3d50
Create Date: 2026-02-12 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'fd9a1b2c3d50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types safely
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN CREATE TYPE member_role AS ENUM ('owner', 'member'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN CREATE TYPE member_status AS ENUM ('pending', 'accepted', 'declined'); END IF; END $$;")

    member_role = ENUM('owner', 'member', name='member_role', create_type=False)
    member_status = ENUM('pending', 'accepted', 'declined', name='member_status', create_type=False)

    # Create profile_members table
    op.create_table(
        'profile_members',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('profile_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('role', member_role, nullable=False, server_default='member'),
        sa.Column('status', member_status, nullable=False, server_default='pending'),
        sa.Column('invited_email', sa.String(255), nullable=True),
        sa.Column('invited_by_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('profile_id', 'user_id', name='uq_profile_member_user'),
        sa.UniqueConstraint('profile_id', 'invited_email', name='uq_profile_member_email'),
    )

    # Backfill: create OWNER membership for every existing profile
    op.execute(
        """
        INSERT INTO profile_members (id, profile_id, user_id, role, status, created_at, updated_at)
        SELECT gen_random_uuid(), id, user_id, 'owner', 'accepted', created_at, now()
        FROM profiles
        """
    )


def downgrade() -> None:
    op.drop_table('profile_members')

    # Drop enum types
    sa.Enum(name='member_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='member_role').drop(op.get_bind(), checkfirst=True)
