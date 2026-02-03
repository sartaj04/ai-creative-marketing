"""add location to profile

Revision ID: 5c8f1234abcd
Revises: a1b2c3d4e5f6
Create Date: 2026-02-03 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '5c8f1234abcd'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add location column to profiles table
    op.add_column('profiles', sa.Column(
        'location', 
        sa.String(length=255), 
        nullable=True, 
        comment="Target market or physical location (e.g. 'New York, US')"
    ))

def downgrade() -> None:
    # Remove location column
    op.drop_column('profiles', 'location')
