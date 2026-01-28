"""Add template ownership and contribution fields.

Revision ID: 002
Revises: 001
Create Date: 2026-01-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create contribution_status enum
    contribution_status_enum = sa.Enum(
        'none', 'pending', 'approved', 'rejected',
        name='contributionstatus'
    )
    contribution_status_enum.create(op.get_bind(), checkfirst=True)

    # Add new columns to templates table
    op.add_column(
        'templates',
        sa.Column(
            'is_system',
            sa.Boolean(),
            nullable=False,
            server_default='false',
            comment='True for admin-created system templates visible to all'
        )
    )
    op.add_column(
        'templates',
        sa.Column(
            'is_contributed',
            sa.Boolean(),
            nullable=False,
            server_default='false',
            comment='True if user wants to share template with platform'
        )
    )
    op.add_column(
        'templates',
        sa.Column(
            'contribution_status',
            contribution_status_enum,
            nullable=False,
            server_default='none',
            comment='Moderation status for contributed templates'
        )
    )

    # Create indexes for efficient querying
    op.create_index(
        'ix_templates_is_system',
        'templates',
        ['is_system']
    )
    op.create_index(
        'ix_templates_contribution_status',
        'templates',
        ['contribution_status']
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_templates_contribution_status', table_name='templates')
    op.drop_index('ix_templates_is_system', table_name='templates')

    # Drop columns
    op.drop_column('templates', 'contribution_status')
    op.drop_column('templates', 'is_contributed')
    op.drop_column('templates', 'is_system')

    # Drop enum type
    sa.Enum(name='contributionstatus').drop(op.get_bind(), checkfirst=True)
