"""Add website_url and resume_path to profile_sources

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6a7
Create Date: 2026-02-19
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "c3d4e5f6g7h8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profile_sources", sa.Column("website_url", sa.String(500), nullable=True))
    op.add_column("profile_sources", sa.Column("resume_path", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("profile_sources", "resume_path")
    op.drop_column("profile_sources", "website_url")
