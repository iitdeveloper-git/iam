"""create missing application enums

Revision ID: cb8255c90c1b
Revises: 0001_initial_schema
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "cb8255c90c1b"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()

    sa.Enum(
        "active",
        "disabled",
        "deleted",
        name="applicationstatus",
    ).create(bind, checkfirst=True)

    sa.Enum(
        "authentication_only",
        "application_access",
        "direct_roles",
        "product_managed",
        name="authorizationmode",
    ).create(bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()

    sa.Enum(
        "authentication_only",
        "application_access",
        "direct_roles",
        "product_managed",
        name="authorizationmode",
    ).drop(bind, checkfirst=True)

    sa.Enum(
        "active",
        "disabled",
        "deleted",
        name="applicationstatus",
    ).drop(bind, checkfirst=True)