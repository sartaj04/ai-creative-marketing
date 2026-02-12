"""add_common_mistakes_category

Revision ID: fd9a1b2c3d4e
Revises: fc832e18ca42
Create Date: 2026-02-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd9a1b2c3d4e'
down_revision: Union[str, None] = 'e1f2g3h4i5j6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'common_mistakes' to the template_category enum
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE template_category ADD VALUE IF NOT EXISTS 'common_mistakes'")


def downgrade() -> None:
    # Postgres enums don't support removing values easily
    pass
