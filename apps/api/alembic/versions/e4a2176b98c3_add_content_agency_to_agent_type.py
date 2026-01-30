"""add_content_agency_to_agent_type

Revision ID: e4a2176b98c3
Revises: dc2f48fe521f
Create Date: 2026-01-30 18:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4a2176b98c3'
down_revision: Union[str, None] = 'dc2f48fe521f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add all agent types in both lowercase and uppercase to the enum
    # This handles case sensitivity issues
    new_values = [
        # Lowercase
        'content_agency',
        'style_learner',
        'opportunity_scout',
        'draft_generator',
        'feedback_loop',
        'repurposing',
        'analytics_digest',
        # Uppercase
        'CONTENT_AGENCY',
        'STYLE_LEARNER',
        'OPPORTUNITY_SCOUT',
        'DRAFT_GENERATOR',
        'FEEDBACK_LOOP',
        'REPURPOSING',
        'ANALYTICS_DIGEST'
    ]
    
    # We use execute with commit because altering types cannot run in a transaction block
    with op.get_context().autocommit_block():
        for value in new_values:
            op.execute(f"ALTER TYPE agent_type ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # Cannot remove enum values easily in Postgres
    pass
