"""Add source column and partial unique indexes to user_role_assignments

Revision ID: 0002_role_assignment_uniqueness
Revises: 0001_initial_schema
Create Date: 2026-06-29
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "0002_role_assignment_uniqueness"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add source column
    op.add_column(
        "user_role_assignments",
        sa.Column("source", sa.String(40), nullable=False, server_default="manual"),
    )

    # Drop the old plain lookup index
    op.drop_index("ix_user_role_assignment_lookup", table_name="user_role_assignments", if_exists=True)

    # Partial unique index for platform roles (application_id IS NULL)
    op.create_index(
        "uq_platform_role_assignment",
        "user_role_assignments",
        ["user_id", "role_id"],
        unique=True,
        postgresql_where=text("application_id IS NULL"),
        sqlite_where=text("application_id IS NULL"),
    )

    # Partial unique index for application-scoped roles (application_id IS NOT NULL)
    op.create_index(
        "uq_application_role_assignment",
        "user_role_assignments",
        ["user_id", "role_id", "application_id"],
        unique=True,
        postgresql_where=text("application_id IS NOT NULL"),
        sqlite_where=text("application_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_application_role_assignment", table_name="user_role_assignments")
    op.drop_index("uq_platform_role_assignment", table_name="user_role_assignments")
    op.create_index("ix_user_role_assignment_lookup", "user_role_assignments", ["user_id", "application_id"])
    op.drop_column("user_role_assignments", "source")
