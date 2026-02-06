"""Drop legacy and unused columns

This migration removes columns that have been superseded by better alternatives:
- IdentityGraph: themes, expertise_keywords, tone_markers, audience_notes,
  contrarian_views, education, career_stage (replaced by Timeline, StyleProfile, beliefs)
- ProfileSource: website_url, resume_path, manual_text, rss_urls (never implemented)
- Template: image_template, carousel_slides, media_placeholders (future-proofing never used)

Revision ID: e1f2g3h4i5j6
Revises: fc832e18ca42
Create Date: 2026-02-06
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'e1f2g3h4i5j6'
down_revision: Union[str, None] = 'fc832e18ca42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop IdentityGraph legacy columns
    op.drop_column('identity_graphs', 'themes')
    op.drop_column('identity_graphs', 'expertise_keywords')
    op.drop_column('identity_graphs', 'tone_markers')
    op.drop_column('identity_graphs', 'audience_notes')
    op.drop_column('identity_graphs', 'contrarian_views')
    op.drop_column('identity_graphs', 'education')
    op.drop_column('identity_graphs', 'career_stage')

    # Drop ProfileSource unused columns
    op.drop_column('profile_sources', 'website_url')
    op.drop_column('profile_sources', 'resume_path')
    op.drop_column('profile_sources', 'manual_text')
    op.drop_column('profile_sources', 'rss_urls')

    # Drop Template future-proofing columns
    op.drop_column('templates', 'image_template')
    op.drop_column('templates', 'carousel_slides')
    op.drop_column('templates', 'media_placeholders')


def downgrade() -> None:
    # Re-add IdentityGraph columns
    op.add_column('identity_graphs', sa.Column('themes', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.add_column('identity_graphs', sa.Column('expertise_keywords', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.add_column('identity_graphs', sa.Column('tone_markers', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=True))
    op.add_column('identity_graphs', sa.Column('audience_notes', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=True))
    op.add_column('identity_graphs', sa.Column('contrarian_views', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.add_column('identity_graphs', sa.Column('education', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.add_column('identity_graphs', sa.Column('career_stage', sa.String(), nullable=True))

    # Re-add ProfileSource columns
    op.add_column('profile_sources', sa.Column('website_url', sa.String(500), nullable=True))
    op.add_column('profile_sources', sa.Column('resume_path', sa.String(500), nullable=True))
    op.add_column('profile_sources', sa.Column('manual_text', sa.Text(), nullable=True))
    op.add_column('profile_sources', sa.Column('rss_urls', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))

    # Re-add Template columns
    op.add_column('templates', sa.Column('image_template', sa.Text(), nullable=True))
    op.add_column('templates', sa.Column('carousel_slides', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('templates', sa.Column('media_placeholders', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
