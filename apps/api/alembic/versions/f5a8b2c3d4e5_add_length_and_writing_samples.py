"""add_length_and_writing_samples

Revision ID: f5a8b2c3d4e5
Revises: e4a2176b98c3
Create Date: 2026-01-31 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f5a8b2c3d4e5'
down_revision: Union[str, None] = 'e4a2176b98c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add USER_POST to SourceType enum
    op.execute("ALTER TYPE source_type ADD VALUE IF NOT EXISTS 'user_post'")
    
    # Add writing sample fields to style_profiles
    op.add_column('style_profiles', sa.Column(
        'writing_samples_count',
        sa.Integer(),
        nullable=False,
        server_default='0',
        comment='Number of user posts analyzed'
    ))
    op.add_column('style_profiles', sa.Column(
        'writing_sample_insights',
        sa.Text(),
        nullable=True,
        comment='LLM-generated summary of user writing patterns'
    ))
    op.add_column('style_profiles', sa.Column(
        'detected_patterns',
        postgresql.JSONB(),
        nullable=True,
        comment='Structured patterns extracted from writing samples'
    ))
    
    # Add length flexibility fields to templates
    op.add_column('templates', sa.Column(
        'length_flexibility',
        sa.String(50),
        nullable=False,
        server_default='flexible',
        comment='fixed, semi_flexible, or flexible'
    ))
    op.add_column('templates', sa.Column(
        'min_length',
        sa.Integer(),
        nullable=True,
        comment='Minimum word count (if fixed/semi_flexible)'
    ))
    op.add_column('templates', sa.Column(
        'max_length',
        sa.Integer(),
        nullable=True,
        comment='Maximum word count (if fixed/semi_flexible)'
    ))


def downgrade() -> None:
    # Drop template columns
    op.drop_column('templates', 'max_length')
    op.drop_column('templates', 'min_length')
    op.drop_column('templates', 'length_flexibility')
    
    # Drop style_profile columns
    op.drop_column('style_profiles', 'detected_patterns')
    op.drop_column('style_profiles', 'writing_sample_insights')
    op.drop_column('style_profiles', 'writing_samples_count')
    
    # Note: Cannot remove enum value in PostgreSQL, would need to recreate the type
