"""Add media_assets and visual_templates tables

Revision ID: b3c4d5e6f7g8
Revises: a2b3c4d5e6f7
Create Date: 2026-02-21 13:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "b3c4d5e6f7g8"
down_revision = "a2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums
    visual_template_type = postgresql.ENUM(
        "image", "carousel", name="visual_template_type", create_type=False
    )
    media_asset_type = postgresql.ENUM(
        "image", "carousel_slide", "cover_image", name="media_asset_type", create_type=False
    )
    visual_template_type.create(op.get_bind(), checkfirst=True)
    media_asset_type.create(op.get_bind(), checkfirst=True)

    # Create visual_templates table
    op.create_table(
        "visual_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "type",
            visual_template_type,
            nullable=False,
        ),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("preview_url", sa.String(1024), nullable=True),
        sa.Column("html_template", sa.Text(), nullable=True),
        sa.Column("canvas_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "variables_schema",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("slide_count", sa.Integer(), nullable=True),
        sa.Column("slides_schema", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "default_values",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("platform", sa.String(50), server_default="both"),
        sa.Column(
            "dimensions",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{\"width\": 1080, \"height\": 1080}'::jsonb"),
        ),
        sa.Column("is_system", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # Create media_assets table
    op.create_table(
        "media_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "draft_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("drafts.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "type",
            media_asset_type,
            nullable=False,
        ),
        sa.Column("storage_url", sa.String(1024), nullable=False),
        sa.Column("storage_key", sa.String(512), nullable=False),
        sa.Column("alt_text", sa.String(500), nullable=True),
        sa.Column("slide_index", sa.Integer(), nullable=True),
        sa.Column(
            "visual_template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("visual_templates.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("generation_prompt", sa.Text(), nullable=True),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("media_assets")
    op.drop_table("visual_templates")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS media_asset_type")
    op.execute("DROP TYPE IF EXISTS visual_template_type")
