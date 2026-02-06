"""Add deep identity fields (stories, opinion_statements, interest_details) to identity_graphs.

These fields store narrative material auto-extracted from LinkedIn posts,
providing the Writer with concrete stories, specific opinions, and
qualified interest descriptions instead of generic enum labels.

Revision ID: a8f3e7b2c9d4
Revises: 7d9e2f1a3b5c
Create Date: 2026-02-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a8f3e7b2c9d4'
down_revision = '7d9e2f1a3b5c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add deep identity fields to identity_graphs."""
    op.add_column('identity_graphs', sa.Column(
        'stories', postgresql.JSONB(astext_type=sa.Text()),
        server_default='[]', nullable=False,
        comment='Concrete narrative episodes: [{title, narrative, tags, emotional_core, source_post_excerpt}]',
    ))
    op.add_column('identity_graphs', sa.Column(
        'opinion_statements', postgresql.JSONB(astext_type=sa.Text()),
        server_default='[]', nullable=False,
        comment='Specific argued positions in full sentences, not labels',
    ))
    op.add_column('identity_graphs', sa.Column(
        'interest_details', postgresql.JSONB(astext_type=sa.Text()),
        server_default='{}', nullable=False,
        comment='Qualified interest descriptions: {interest_key: specific_description}',
    ))


def downgrade() -> None:
    """Remove deep identity fields."""
    op.drop_column('identity_graphs', 'interest_details')
    op.drop_column('identity_graphs', 'opinion_statements')
    op.drop_column('identity_graphs', 'stories')
