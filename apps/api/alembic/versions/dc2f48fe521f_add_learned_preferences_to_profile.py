"""add_learned_preferences_to_profile

Revision ID: dc2f48fe521f
Revises: 9f3c7a8b2d1e
Create Date: 2026-01-30 16:36:09.384173

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'dc2f48fe521f'
down_revision: Union[str, None] = '9f3c7a8b2d1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add learned preferences columns to profiles
    op.add_column('profiles', sa.Column(
        'learned_preferences', 
        sa.Text(), 
        nullable=True, 
        comment='Summary of learned content preferences from user feedback'
    ))
    op.add_column('profiles', sa.Column(
        'learned_preferences_updated_at', 
        sa.DateTime(timezone=True), 
        nullable=True, 
        comment='When learned preferences were last updated'
    ))
    op.add_column('profiles', sa.Column(
        'feedback_count_since_last_learn', 
        sa.Integer(), 
        nullable=False,
        server_default='0',
        comment='Number of feedback events since last learning run'
    ))


def downgrade() -> None:
    op.drop_column('profiles', 'feedback_count_since_last_learn')
    op.drop_column('profiles', 'learned_preferences_updated_at')
    op.drop_column('profiles', 'learned_preferences')
