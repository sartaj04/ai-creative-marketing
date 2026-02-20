"""Add news metadata columns to drafts

Revision ID: a2b3c4d5e6f7
Revises: fd9a1b2c3d50
Create Date: 2026-02-20 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "a2b3c4d5e6f7"
down_revision = "c3d4e5f6g7h8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "drafts",
        sa.Column(
            "is_news_driven",
            sa.Boolean(),
            nullable=True,
            server_default=sa.text("false"),
            comment="Whether this draft was inspired by a trending news signal",
        ),
    )
    op.add_column(
        "drafts",
        sa.Column(
            "news_source",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="Source news metadata: {headline, source_url, category}",
        ),
    )


def downgrade() -> None:
    op.drop_column("drafts", "news_source")
    op.drop_column("drafts", "is_news_driven")
