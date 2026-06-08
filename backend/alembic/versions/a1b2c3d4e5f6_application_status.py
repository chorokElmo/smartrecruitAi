"""add status to applications

Revision ID: a1b2c3d4e5f6
Revises: 64341120e00e
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f6"
down_revision = "64341120e00e"
branch_labels = None
depends_on = None


def upgrade():
    status_enum = sa.Enum(
        "applied", "pending", "rejected", "accepted",
        name="application_status_enum",
    )
    status_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "applications",
        sa.Column("status", status_enum, nullable=False, server_default="applied"),
    )
    op.add_column(
        "applications",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("UPDATE applications SET created_at = applied_at WHERE applied_at IS NOT NULL")
    op.drop_column("applications", "applied_at")


def downgrade():
    op.add_column(
        "applications",
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.drop_column("applications", "status")
    op.drop_column("applications", "created_at")
    sa.Enum(name="application_status_enum").drop(op.get_bind(), checkfirst=True)
