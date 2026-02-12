"""add_uppercase_common_mistakes

Revision ID: fd9a1b2c3d4f
Revises: fd9a1b2c3d4e
Create Date: 2026-02-12 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd9a1b2c3d4f'
down_revision: Union[str, None] = 'fd9a1b2c3d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'COMMON_MISTAKES' (uppercase) to the template_category enum
    # User requested both small and capital to handle potential case sensitivity issues
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE template_category ADD VALUE IF NOT EXISTS 'COMMON_MISTAKES'")


def downgrade() -> None:
    pass
