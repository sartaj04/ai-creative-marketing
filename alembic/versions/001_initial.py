"""Initial migration - Create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ENUM types
    user_tier = postgresql.ENUM('free', 'starter', 'pro', name='user_tier', create_type=True)
    user_segment = postgresql.ENUM('ecommerce', 'saas', 'personal', name='user_segment', create_type=True)
    profile_type = postgresql.ENUM('ecommerce', 'saas', 'personal', name='profile_type', create_type=True)
    template_segment = postgresql.ENUM('ecommerce', 'saas', 'personal', name='template_segment', create_type=True)
    asset_platform = postgresql.ENUM(
        'instagram_feed', 'instagram_story', 'instagram_reel', 
        'facebook', 'linkedin', 'twitter', 'google_display',
        name='asset_platform', create_type=True
    )
    calendar_platform = postgresql.ENUM(
        'instagram_feed', 'instagram_story', 'instagram_reel', 
        'facebook', 'linkedin', 'twitter', 'google_display',
        name='calendar_platform', create_type=True
    )
    content_status = postgresql.ENUM('draft', 'scheduled', 'published', name='content_status', create_type=True)
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('tier', user_tier, nullable=False, server_default='free'),
        sa.Column('segment', user_segment, nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('usage_reset_date', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_users_email', 'users', ['email'])
    
    # Templates table
    op.create_table(
        'templates',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('segment', template_segment, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=False, server_default='general'),
        sa.Column('html_code', sa.Text(), nullable=False),
        sa.Column('css_code', sa.Text(), nullable=False),
        sa.Column('thumbnail_url', sa.Text(), nullable=True),
        sa.Column('aspect_ratios', postgresql.JSONB(), nullable=False),
        sa.Column('platforms', postgresql.JSONB(), nullable=False),
        sa.Column('variables', postgresql.JSONB(), nullable=False),
        sa.Column('default_values', postgresql.JSONB(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_premium', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_templates_segment', 'templates', ['segment'])
    
    # Brand Profiles table
    op.create_table(
        'brand_profiles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('profile_type', profile_type, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('website_url', sa.Text(), nullable=False),
        sa.Column('brand_assets', postgresql.JSONB(), nullable=False),
        sa.Column('voice_profile', postgresql.JSONB(), nullable=True),
        sa.Column('scrape_status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('scrape_job_id', sa.String(length=255), nullable=True),
        sa.Column('scrape_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_brand_profiles_user_id', 'brand_profiles', ['user_id'])
    
    # Generated Assets table
    op.create_table(
        'generated_assets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('platform', asset_platform, nullable=False),
        sa.Column('aspect_ratio', sa.String(length=20), nullable=False, server_default='1:1'),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('copy_text', postgresql.JSONB(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('generation_job_id', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['profile_id'], ['brand_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['templates.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_generated_assets_user_id', 'generated_assets', ['user_id'])
    op.create_index('ix_generated_assets_profile_id', 'generated_assets', ['profile_id'])
    op.create_index('ix_generated_assets_platform', 'generated_assets', ['platform'])
    op.create_index('ix_generated_assets_status', 'generated_assets', ['status'])
    
    # Content Calendar table
    op.create_table(
        'content_calendar',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('platform', calendar_platform, nullable=False),
        sa.Column('post_date', sa.Date(), nullable=False),
        sa.Column('post_time', sa.String(length=10), nullable=True),
        sa.Column('status', content_status, nullable=False, server_default='draft'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('external_post_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['asset_id'], ['generated_assets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_content_calendar_user_id', 'content_calendar', ['user_id'])
    op.create_index('ix_content_calendar_post_date', 'content_calendar', ['post_date'])


def downgrade() -> None:
    # Drop tables
    op.drop_table('content_calendar')
    op.drop_table('generated_assets')
    op.drop_table('brand_profiles')
    op.drop_table('templates')
    op.drop_table('users')
    
    # Drop ENUM types
    op.execute('DROP TYPE IF EXISTS content_status')
    op.execute('DROP TYPE IF EXISTS calendar_platform')
    op.execute('DROP TYPE IF EXISTS asset_platform')
    op.execute('DROP TYPE IF EXISTS template_segment')
    op.execute('DROP TYPE IF EXISTS profile_type')
    op.execute('DROP TYPE IF EXISTS user_segment')
    op.execute('DROP TYPE IF EXISTS user_tier')
