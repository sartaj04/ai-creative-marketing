"""Fix profile location type to JSONB

Revision ID: b9c4d8e7f6a5
Revises: a8f3e7b2c9d4
Create Date: 2026-02-04 12:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b9c4d8e7f6a5'
down_revision = 'a8f3e7b2c9d4'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Convert existing String location to JSONB
    # Logic:
    # 1. NULL or '' -> []
    # 2. '[]' -> []
    # 3. '[...]' (valid json array) -> cast directly
    # 4. 'value' -> ['value']
    
    op.execute("""
        ALTER TABLE profiles 
        ALTER COLUMN location TYPE JSONB 
        USING CASE 
            WHEN location IS NULL OR location = '' THEN '[]'::jsonb
            WHEN trim(location) LIKE '[%]' THEN location::jsonb
            ELSE jsonb_build_array(location)
        END
    """)
    
    # Set default to []
    op.alter_column('profiles', 'location', server_default='[]')


def downgrade() -> None:
    # Convert back to String
    op.alter_column('profiles', 'location', 
                    type_=sa.String(255),
                    postgresql_using="location::text")
