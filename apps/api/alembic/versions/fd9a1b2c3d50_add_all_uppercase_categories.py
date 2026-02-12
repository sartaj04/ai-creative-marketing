"""add_all_uppercase_categories

Revision ID: fd9a1b2c3d50
Revises: fd9a1b2c3d4f
Create Date: 2026-02-12 11:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd9a1b2c3d50'
down_revision: Union[str, None] = 'fd9a1b2c3d4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add uppercase variants for all categories to handle SQLAlchemy sending names
    # common_mistakes and COMMON_MISTAKES are already added.
    uppercase_categories = [
        'MYTH_BUSTER',
        'TIPS',
        'STORY',
        'FRAMEWORK',
        'CONTRARIAN',
        'LESSONS',
        'LISTICLE',
        'QUESTION',
        'COMPARISON',
        'ANNOUNCEMENT',
        'CASE_STUDY'
    ]
    
    with op.get_context().autocommit_block():
        for category in uppercase_categories:
            op.execute(f"ALTER TYPE template_category ADD VALUE IF NOT EXISTS '{category}'")


def downgrade() -> None:
    pass
