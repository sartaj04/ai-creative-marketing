"""Add slide_templates and draft_slides tables, add visual_template_id to drafts

Revision ID: c4d5e6f7g8h9
Revises: b3c4d5e6f7g8
Create Date: 2026-02-22 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "c4d5e6f7g8h9"
down_revision = "b3c4d5e6f7g8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create slide_templates table
    op.create_table(
        "slide_templates",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "visual_template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("visual_templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "html_structure",
            sa.Text(),
            nullable=False,
            comment="Full HTML/CSS with {{variable}} slots for this slide",
        ),
        sa.Column(
            "variable_schema",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            comment="{name: {type, maxLength, required, description}}",
        ),
        sa.Column(
            "default_values",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            comment="Example values used for preview",
        ),
        sa.Column(
            "order",
            sa.Integer(),
            nullable=False,
            comment="1-indexed slide position within the carousel",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_slide_templates_visual_template_id",
        "slide_templates",
        ["visual_template_id"],
    )

    # 2. Create draft_slides table
    op.create_table(
        "draft_slides",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "draft_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("drafts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "slide_template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("slide_templates.id", ondelete="SET NULL"),
            nullable=True,
            comment="Source slide template. SET NULL if template deleted (preserves draft history).",
        ),
        sa.Column(
            "rendered_html",
            sa.Text(),
            nullable=False,
            comment="Final HTML with all {{variables}} already substituted",
        ),
        sa.Column(
            "filled_variables",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            comment="{variable_name: value} — audit trail and re-render source",
        ),
        sa.Column(
            "order",
            sa.Integer(),
            nullable=False,
            comment="0-indexed slide position within the draft",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_draft_slides_draft_id", "draft_slides", ["draft_id"])

    # 3. Add visual_template_id FK column to drafts
    op.add_column(
        "drafts",
        sa.Column(
            "visual_template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("visual_templates.id", ondelete="SET NULL"),
            nullable=True,
            comment="The visual template used to generate this draft's layout",
        ),
    )


def downgrade() -> None:
    op.drop_column("drafts", "visual_template_id")
    op.drop_index("ix_draft_slides_draft_id", table_name="draft_slides")
    op.drop_table("draft_slides")
    op.drop_index("ix_slide_templates_visual_template_id", table_name="slide_templates")
    op.drop_table("slide_templates")
