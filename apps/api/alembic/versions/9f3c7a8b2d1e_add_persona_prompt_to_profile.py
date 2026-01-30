"""add_persona_prompt_to_profile

Revision ID: 9f3c7a8b2d1e
Revises: 8cc4b1996fd5
Create Date: 2026-01-30 14:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f3c7a8b2d1e'
down_revision: Union[str, None] = '8cc4b1996fd5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add persona prompt fields to profiles
    op.add_column(
        'profiles',
        sa.Column(
            'persona_prompt',
            sa.Text(),
            nullable=True,
            comment='Pre-synthesized natural language prompt from identity+style'
        )
    )
    op.add_column(
        'profiles',
        sa.Column(
            'persona_prompt_updated_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='When persona prompt was last synthesized'
        )
    )


def downgrade() -> None:
    # Remove persona prompt fields
    op.drop_column('profiles', 'persona_prompt_updated_at')
    op.drop_column('profiles', 'persona_prompt')
