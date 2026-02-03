"""Add content diversity columns to drafts table.

Adds content_mode, authority_posture, emotional_tone, identity_facets_used,
and topic_domain for enforcing variety across generated content.

Revision ID: 7d9e2f1a3b5c
Revises: 5c8f1234abcd
Create Date: 2026-02-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '7d9e2f1a3b5c'
down_revision = '5c8f1234abcd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add diversity dimension columns to drafts."""
    op.add_column('drafts', sa.Column(
        'content_mode', sa.String(50), nullable=True,
        comment='Content mode: builder, learner, narrator, observer, explainer, skeptic, advisor',
    ))
    op.add_column('drafts', sa.Column(
        'authority_posture', sa.String(50), nullable=True,
        comment='Authority posture: curious, uncertain, peer_level, experienced, reflective, decisive',
    ))
    op.add_column('drafts', sa.Column(
        'emotional_tone', sa.String(50), nullable=True,
        comment='Emotional tone: excited, frustrated, contemplative, amused, vulnerable, matter_of_fact',
    ))
    op.add_column('drafts', sa.Column(
        'identity_facets_used', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
        comment='Which identity facets were sampled for this draft',
    ))
    op.add_column('drafts', sa.Column(
        'topic_domain', sa.String(50), nullable=True,
        comment='Topic domain: technical, personal, industry, philosophical, creative, professional',
    ))


def downgrade() -> None:
    """Remove diversity dimension columns."""
    op.drop_column('drafts', 'topic_domain')
    op.drop_column('drafts', 'identity_facets_used')
    op.drop_column('drafts', 'emotional_tone')
    op.drop_column('drafts', 'authority_posture')
    op.drop_column('drafts', 'content_mode')
