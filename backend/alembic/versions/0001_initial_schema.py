"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("keycloak_user_id", sa.String(128), unique=True),
        sa.Column("identity_issuer", sa.String(512), nullable=False),
        sa.Column("identity_subject", sa.String(256), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("normalized_email", sa.String(320), nullable=False, unique=True),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("display_name", sa.String(200)),
        sa.Column("first_name", sa.String(100)),
        sa.Column("last_name", sa.String(100)),
        sa.Column("avatar_url", sa.String(1024)),
        sa.Column("status", sa.String(40), nullable=False, server_default="invited"),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("disabled_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("identity_issuer", "identity_subject", name="uq_users_identity"),
    )
    op.create_index("ix_users_identity", "users", ["identity_issuer", "identity_subject"])
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("logo_url", sa.String(1024)),
        sa.Column("homepage_url", sa.String(1024)),
        sa.Column("privacy_policy_url", sa.String(1024)),
        sa.Column("terms_url", sa.String(1024)),
        sa.Column("status", sa.String(40), nullable=False, server_default="active"),
        sa.Column("authorization_mode", sa.String(80), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_applications_key", "applications", ["key"])
    op.create_table(
        "application_environments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("environment", sa.String(40), nullable=False),
        sa.Column("issuer_url", sa.String(512), nullable=False),
        sa.Column("audience", sa.String(160), nullable=False),
        sa.Column("client_id", sa.String(160), nullable=False),
        sa.Column("client_type", sa.String(40), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("application_id", "environment", name="uq_app_environment"),
    )
    op.create_table(
        "redirect_uris",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_environment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("application_environments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("redirect_uri", sa.String(2048), nullable=False),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("position('*' in redirect_uri) = 0", name="ck_redirect_uri_no_wildcard"),
        sa.UniqueConstraint("application_environment_id", "redirect_uri", "type", name="uq_redirect_uri"),
    )
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id")),
        sa.Column("key", sa.String(120), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("scope", sa.String(40), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("application_id", "key", name="uq_role_app_key"),
    )
    op.create_table(
        "permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id")),
        sa.Column("key", sa.String(160), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("application_id", "key", name="uq_permission_app_key"),
    )
    op.create_table("role_permissions", sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True), sa.Column("permission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True))
    op.create_table("application_access_grants", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id"), nullable=False), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False), sa.Column("status", sa.String(40), nullable=False), sa.Column("granted_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")), sa.Column("granted_at", sa.DateTime(timezone=True)), sa.Column("expires_at", sa.DateTime(timezone=True)), sa.Column("revoked_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.UniqueConstraint("application_id", "user_id", name="uq_application_user_grant"))
    op.create_table("user_role_assignments", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False), sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id")), sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id"), nullable=False), sa.Column("status", sa.String(40), nullable=False), sa.Column("assigned_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("expires_at", sa.DateTime(timezone=True)))
    op.create_index("ix_user_role_assignment_lookup", "user_role_assignments", ["user_id", "application_id"])
    op.create_table("invitations", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("email", sa.String(320), nullable=False), sa.Column("normalized_email", sa.String(320), nullable=False), sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id")), sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id")), sa.Column("token_hash", sa.String(128), nullable=False, unique=True), sa.Column("status", sa.String(40), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("invited_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")), sa.Column("keycloak_user_id", sa.String(128)), sa.Column("accepted_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")), sa.Column("accepted_at", sa.DateTime(timezone=True)), sa.Column("revoked_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_invitations_email_status", "invitations", ["normalized_email", "status"])
    op.create_table("service_accounts", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id"), nullable=False), sa.Column("name", sa.String(160), nullable=False), sa.Column("description", sa.Text()), sa.Column("keycloak_client_id", sa.String(160), nullable=False, unique=True), sa.Column("status", sa.String(40), nullable=False), sa.Column("secret_reference", sa.String(512)), sa.Column("secret_version", sa.String(80)), sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("rotated_at", sa.DateTime(timezone=True)), sa.Column("expires_at", sa.DateTime(timezone=True)), sa.Column("last_used_at", sa.DateTime(timezone=True)))
    op.create_table("session_projections", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False), sa.Column("keycloak_session_id", sa.String(160), nullable=False), sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id")), sa.Column("started_at", sa.DateTime(timezone=True), nullable=False), sa.Column("last_seen_at", sa.DateTime(timezone=True)), sa.Column("ended_at", sa.DateTime(timezone=True)), sa.Column("termination_reason", sa.String(160)))
    op.create_table("audit_events", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("actor_type", sa.String(40), nullable=False), sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")), sa.Column("actor_service_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("service_accounts.id")), sa.Column("action", sa.String(160), nullable=False), sa.Column("resource_type", sa.String(120), nullable=False), sa.Column("resource_id", sa.String(160)), sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id")), sa.Column("request_id", sa.String(80), nullable=False), sa.Column("correlation_id", sa.String(80)), sa.Column("source_ip", sa.String(80)), sa.Column("user_agent", sa.String(512)), sa.Column("result", sa.String(40), nullable=False), sa.Column("reason_code", sa.String(80)), sa.Column("before_summary", postgresql.JSONB), sa.Column("after_summary", postgresql.JSONB), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])
    op.create_index("ix_audit_events_actor_user_id", "audit_events", ["actor_user_id"])
    op.create_index("ix_audit_events_application_id", "audit_events", ["application_id"])


def downgrade() -> None:
    for table in [
        "audit_events",
        "session_projections",
        "service_accounts",
        "invitations",
        "user_role_assignments",
        "application_access_grants",
        "role_permissions",
        "permissions",
        "roles",
        "redirect_uris",
        "application_environments",
        "applications",
        "users",
    ]:
        op.drop_table(table)

