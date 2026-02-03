"""Add style metadata columns to drafts table for uniqueness tracking.

Revision ID: a1b2c3d4e5f6
Revises: e4a2176b98c3
Create Date: 2026-02-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f5a8b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add hook_style, format_archetype, cta_style, and hashtags columns."""
    op.add_column('drafts', sa.Column('hook_style', sa.String(50), nullable=True))
    op.add_column('drafts', sa.Column('format_archetype', sa.String(50), nullable=True))
    op.add_column('drafts', sa.Column('cta_style', sa.String(50), nullable=True))
    op.add_column('drafts', sa.Column('hashtags', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    """Remove style metadata columns."""
    op.drop_column('drafts', 'hashtags')
    op.drop_column('drafts', 'cta_style')
    op.drop_column('drafts', 'format_archetype')
    op.drop_column('drafts', 'hook_style')
