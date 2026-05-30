"""add_server_defaults_to_scores

Revision ID: 8cd23cb0e6c2
Revises: 2a6ab5e3ef6b
Create Date: 2026-05-29 22:19:47.853151

Adds PostgreSQL-side DEFAULT 0.0 to semantic_score and keyword_score.
This guarantees INSERTs succeed even if the ORM omits those columns,
which can happen on the first run after Phase 3 migration.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8cd23cb0e6c2'
down_revision: Union[str, None] = '2a6ab5e3ef6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'recommendations', 'semantic_score',
        existing_type=sa.Float(),
        server_default=sa.text('0.0'),
        existing_nullable=False,
    )
    op.alter_column(
        'recommendations', 'keyword_score',
        existing_type=sa.Float(),
        server_default=sa.text('0.0'),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'recommendations', 'semantic_score',
        existing_type=sa.Float(),
        server_default=None,
        existing_nullable=False,
    )
    op.alter_column(
        'recommendations', 'keyword_score',
        existing_type=sa.Float(),
        server_default=None,
        existing_nullable=False,
    )
