"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-01-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable UUID extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # Create enum types
    op.execute("CREATE TYPE profile_type AS ENUM ('individual', 'enterprise')")
    op.execute("CREATE TYPE source_type AS ENUM ('linkedin', 'website', 'resume', 'manual', 'rss', 'blog')")
    op.execute("CREATE TYPE draft_status AS ENUM ('inbox', 'approved', 'scheduled', 'published', 'rejected')")
    op.execute("CREATE TYPE draft_format AS ENUM ('post', 'thread', 'carousel', 'article')")
    op.execute("CREATE TYPE draft_action AS ENUM ('approve', 'reject', 'edit', 'schedule', 'publish')")
    op.execute("CREATE TYPE platform_type AS ENUM ('linkedin', 'twitter')")
    op.execute("CREATE TYPE agent_type AS ENUM ('style_learner', 'opportunity_scout', 'draft_generator', 'feedback_loop', 'repurposing', 'analytics_digest')")
    op.execute("CREATE TYPE opportunity_status AS ENUM ('new', 'used', 'dismissed', 'expired')")
    op.execute("CREATE TYPE template_category AS ENUM ('myth_buster', 'tips', 'story', 'framework', 'contrarian', 'lessons', 'listicle', 'question', 'comparison', 'announcement', 'case_study')")

    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Profiles table
    op.create_table(
        'profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('type', postgresql.ENUM('individual', 'enterprise', name='profile_type', create_type=False), nullable=False, default='individual'),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Profile sources table
    op.create_table(
        'profile_sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('linkedin_url', sa.String(500), nullable=True),
        sa.Column('website_url', sa.String(500), nullable=True),
        sa.Column('resume_path', sa.String(500), nullable=True),
        sa.Column('manual_text', sa.Text(), nullable=True),
        sa.Column('rss_urls', postgresql.JSONB(), default=[]),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Identity graphs table
    op.create_table(
        'identity_graphs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('themes', postgresql.JSONB(), default=[]),
        sa.Column('expertise_keywords', postgresql.JSONB(), default=[]),
        sa.Column('tone_markers', postgresql.JSONB(), default={}),
        sa.Column('audience_notes', postgresql.JSONB(), default={}),
        sa.Column('authority_angles', postgresql.JSONB(), default=[]),
        sa.Column('narrative_themes', postgresql.JSONB(), default=[]),
        sa.Column('version', sa.Integer(), default=1),
        sa.Column('last_updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Style profiles table
    op.create_table(
        'style_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('tone_sliders', postgresql.JSONB(), default={}),
        sa.Column('format_preferences', postgresql.JSONB(), default={}),
        sa.Column('taboo_list', postgresql.JSONB(), default=[]),
        sa.Column('preferred_hooks', postgresql.JSONB(), default=[]),
        sa.Column('weights', postgresql.JSONB(), default={}),
        sa.Column('version', sa.Integer(), default=1),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Extracted documents table
    op.create_table(
        'extracted_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_type', postgresql.ENUM('linkedin', 'website', 'resume', 'manual', 'rss', 'blog', name='source_type', create_type=False), nullable=False),
        sa.Column('source_url', sa.String(500), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata_json', postgresql.JSONB(), default={}),
        sa.Column('extracted_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Opportunities table
    op.create_table(
        'opportunities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('topic', sa.String(255), nullable=False),
        sa.Column('angle', sa.Text(), nullable=True),
        sa.Column('source_url', sa.String(500), nullable=True),
        sa.Column('source_type', postgresql.ENUM('linkedin', 'website', 'resume', 'manual', 'rss', 'blog', name='source_type', create_type=False), nullable=True),
        sa.Column('relevance_score', sa.Float(), default=0.0),
        sa.Column('status', postgresql.ENUM('new', 'used', 'dismissed', 'expired', name='opportunity_status', create_type=False), default='new', index=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Templates table
    op.create_table(
        'templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('format', postgresql.ENUM('post', 'thread', 'carousel', 'article', name='draft_format', create_type=False), default='post'),
        sa.Column('category', postgresql.ENUM('myth_buster', 'tips', 'story', 'framework', 'contrarian', 'lessons', 'listicle', 'question', 'comparison', 'announcement', 'case_study', name='template_category', create_type=False), nullable=False),
        sa.Column('tags', postgresql.JSONB(), default=[]),
        sa.Column('variables', postgresql.JSONB(), default={}),
        sa.Column('use_cases', postgresql.JSONB(), default=[]),
        sa.Column('tone_fit', postgresql.JSONB(), default=[]),
        sa.Column('platform', sa.String(50), default='both'),
        sa.Column('image_template', sa.Text(), nullable=True),
        sa.Column('carousel_slides', postgresql.JSONB(), nullable=True),
        sa.Column('media_placeholders', postgresql.JSONB(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Drafts table
    op.create_table(
        'drafts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('opportunity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('opportunities.id', ondelete='SET NULL'), nullable=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('templates.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', postgresql.ENUM('inbox', 'approved', 'scheduled', 'published', 'rejected', name='draft_status', create_type=False), default='inbox', index=True),
        sa.Column('format', postgresql.ENUM('post', 'thread', 'carousel', 'article', name='draft_format', create_type=False), default='post'),
        sa.Column('hook', sa.Text(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('topic', sa.String(255), nullable=True),
        sa.Column('confidence', sa.Float(), default=0.0),
        sa.Column('sources_json', postgresql.JSONB(), default=[]),
        sa.Column('generated_by', postgresql.ENUM('style_learner', 'opportunity_scout', 'draft_generator', 'feedback_loop', 'repurposing', 'analytics_digest', name='agent_type', create_type=False), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('platform', postgresql.ENUM('linkedin', 'twitter', name='platform_type', create_type=False), nullable=True),
        sa.Column('external_post_id', sa.String(255), nullable=True),
        sa.Column('engagement_data', postgresql.JSONB(), default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Draft events table
    op.create_table(
        'draft_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('draft_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('drafts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('action', postgresql.ENUM('approve', 'reject', 'edit', 'schedule', 'publish', name='draft_action', create_type=False), nullable=False, index=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('previous_state', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Schedules table
    op.create_table(
        'schedules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('draft_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('drafts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scheduled_time', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('platform', postgresql.ENUM('linkedin', 'twitter', name='platform_type', create_type=False), nullable=False),
        sa.Column('status', sa.String(50), default='pending', index=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Template usages table
    op.create_table(
        'template_usages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('templates.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('draft_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('drafts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('was_approved', sa.Boolean(), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Agent runs table
    op.create_table(
        'agent_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('agent_type', postgresql.ENUM('style_learner', 'opportunity_scout', 'draft_generator', 'feedback_loop', 'repurposing', 'analytics_digest', name='agent_type', create_type=False), nullable=False, index=True),
        sa.Column('status', sa.String(50), default='running'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('result_summary', sa.Text(), nullable=True),
        sa.Column('items_processed', sa.Integer(), default=0),
        sa.Column('items_generated', sa.Integer(), default=0),
        sa.Column('logs_json', postgresql.JSONB(), default=[]),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('agent_runs')
    op.drop_table('template_usages')
    op.drop_table('schedules')
    op.drop_table('draft_events')
    op.drop_table('drafts')
    op.drop_table('templates')
    op.drop_table('opportunities')
    op.drop_table('extracted_documents')
    op.drop_table('style_profiles')
    op.drop_table('identity_graphs')
    op.drop_table('profile_sources')
    op.drop_table('profiles')
    op.drop_table('users')

    op.execute('DROP TYPE IF EXISTS template_category')
    op.execute('DROP TYPE IF EXISTS opportunity_status')
    op.execute('DROP TYPE IF EXISTS agent_type')
    op.execute('DROP TYPE IF EXISTS platform_type')
    op.execute('DROP TYPE IF EXISTS draft_action')
    op.execute('DROP TYPE IF EXISTS draft_format')
    op.execute('DROP TYPE IF EXISTS draft_status')
    op.execute('DROP TYPE IF EXISTS source_type')
    op.execute('DROP TYPE IF EXISTS profile_type')
