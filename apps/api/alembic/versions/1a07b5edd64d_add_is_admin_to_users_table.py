"""Add is_admin to users table

Revision ID: 1a07b5edd64d
Revises: 002
Create Date: 2026-01-27 22:46:09.712370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1a07b5edd64d'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_admin column to users table with a default value
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    # Remove is_admin column from users table
    op.drop_column('users', 'is_admin')
