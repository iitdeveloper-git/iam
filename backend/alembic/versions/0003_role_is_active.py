"""Add is_active column to roles

Revision ID: 0003_role_is_active
Revises: 0002_role_assignment_uniqueness
Create Date: 2026-06-29
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_role_is_active"
down_revision = "0002_role_assignment_uniqueness"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "roles",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("roles", "is_active")
