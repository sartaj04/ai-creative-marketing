"""add_education_and_bio_summary_to_identity_graph

Revision ID: 8cc4b1996fd5
Revises: 2509eeaf7f43
Create Date: 2026-01-29 11:11:08.101443

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8cc4b1996fd5'
down_revision: Union[str, None] = '2509eeaf7f43'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add education and bio_summary fields to identity_graphs
    op.add_column('identity_graphs', sa.Column('education', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False, comment='Education history'))
    op.add_column('identity_graphs', sa.Column('bio_summary', sa.String(), nullable=True, comment='Professional bio summary'))


def downgrade() -> None:
    # Remove education and bio_summary fields
    op.drop_column('identity_graphs', 'bio_summary')
    op.drop_column('identity_graphs', 'education')
