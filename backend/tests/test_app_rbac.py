"""
Test suite for application-scoped RBAC administration (IAM-007).
Uses SQLite in-memory DB and mock audit helper.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from uuid import uuid4
from unittest.mock import AsyncMock, patch
from pydantic import PostgresDsn
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, func

from iitd_iam.database import Base

from iitd_iam.models import (
    Application,
    ApplicationAccessGrant,
    ApplicationStatus,
    AssignmentSource,
    AuthorizationMode,
    GrantStatus,
    Permission,
    Role,
    RolePermission,
    RoleScope,
    User,
    UserRoleAssignment,
    UserStatus,
)
from iitd_iam.auth.identity import CurrentPrincipal
from iitd_iam.config import Settings
from iitd_iam.errors import ApiError
from iitd_iam.schemas import RoleCreate, RoleUpdate

def _settings():
    return Settings(
        database_url=PostgresDsn("postgresql://iam:iam@localhost:5432/iam"),
        keycloak_base_url="https://auth.example.com",
        environment="test",
    )

@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        tables_needed = [
            Base.metadata.tables[t] for t in [
                "users",
                "applications",
                "application_environments",
                "application_access_grants",
                "roles",
                "permissions",
                "role_permissions",
                "user_role_assignments",
                "invitations",
            ]
            if t in Base.metadata.tables
        ]
        await conn.run_sync(Base.metadata.create_all, tables=tables_needed)
    yield eng
    await eng.dispose()

@pytest.fixture(autouse=True)
def mock_audit(monkeypatch):
    async def _noop(*args, **kwargs):
        return None
    monkeypatch.setattr("iitd_iam.api.v1.routes.log_audit_event", _noop)
    monkeypatch.setattr("iitd_iam.observability.audit.log_audit_event", _noop)

@pytest_asyncio.fixture
async def session(engine):
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        yield s

def _principal(roles: set[str] = None, permissions: set[str] = None, user_id=None) -> CurrentPrincipal:
    return CurrentPrincipal(
        subject=str(uuid4()),
        issuer="https://keycloak.example.com/realms/iitd",
        email="admin@example.com",
        user_id=user_id or uuid4(),
        roles=roles or {"application_admin"},
        permissions=permissions or set(),
    )

async def _make_app(session: AsyncSession, key: str, status: ApplicationStatus = ApplicationStatus.active) -> Application:
    app = Application(
        key=key,
        name=key.replace("-", " ").title(),
        authorization_mode=AuthorizationMode.application_access,
        status=status,
    )
    session.add(app)
    await session.commit()
    await session.refresh(app)
    return app

async def _make_user(session: AsyncSession, email: str) -> User:
    user = User(
        identity_issuer="dev",
        identity_subject=email,
        keycloak_user_id=email,
        email=email,
        normalized_email=email.lower().strip(),
        status=UserStatus.active,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

def _mock_request():
    req = AsyncMock()
    req.state.request_id = "test-req"
    return req

# ===========================================================================
# Tests for IAM-007 Scoping & Authorization Rules
# ===========================================================================

@pytest.mark.asyncio
async def test_access_alone_does_not_permit_admin(session):
    """Application access alone (e.g. no roles.create/roles.assign platform permission) does not permit RBAC administration."""
    app = await _make_app(session, "app-a")
    user = await _make_user(session, "u@a.com")
    
    # User has access grant
    grant = ApplicationAccessGrant(application_id=app.id, user_id=user.id, status=GrantStatus.active)
    session.add(grant)
    await session.commit()

    # Principal has no roles.create permission
    principal = CurrentPrincipal(subject=str(uuid4()), issuer="dev", email="u@a.com", user_id=user.id, roles={"user"})

    # Check require_permission dependency directly
    from iitd_iam.auth.dependencies import require_permission
    dependency = require_permission("roles.create")
    with pytest.raises(ApiError) as exc_info:
        await dependency(principal)
    assert exc_info.value.status_code == 403
        # Inside the route it checks verify_application_admin scope. Here, the caller lacks platform permission.

@pytest.mark.asyncio
async def test_platform_permission_without_app_scope_rejected(session):
    """Holding roles.create platform permission but having no access grant to the target app raises 403."""
    app = await _make_app(session, "app-b")
    # Caller has platform role application_admin (gives roles.create), but NO access grant for app-b
    principal = _principal(roles={"application_admin"}, permissions={"roles.create"})
    principal = CurrentPrincipal(subject=str(uuid4()), issuer="dev", email="adm@e.com", user_id=uuid4(), roles={"application_admin"})

    from iitd_iam.api.v1.routes import create_application_role
    with patch("iitd_iam.api.v1.routes.get_settings", return_value=_settings()):
        with pytest.raises(ApiError) as exc:
            await create_application_role(
                application_id=app.id,
                payload=RoleCreate(key="role-x", name="Role X"),
                request=_mock_request(),
                session=session,
                principal=principal
            )
        assert exc.value.status_code == 403

@pytest.mark.asyncio
async def test_non_assignable_platform_permission_cannot_be_mapped(session):
    """Platform permission not in allow-list cannot be mapped to application roles."""
    app = await _make_app(session, "app-c")
    role = Role(application_id=app.id, key="role-a", name="Role A", scope=RoleScope.application, is_active=True)
    session.add(role)
    
    # Create sensitive platform permission
    perm = Permission(application_id=None, key="platform.super_admin", name="Super Admin")
    session.add(perm)
    await session.commit()

    principal = _principal(roles={"super_admin"}, permissions={"*"})

    from iitd_iam.api.v1.routes import update_role_permissions
    with patch("iitd_iam.api.v1.routes.get_settings", return_value=_settings()):
        with pytest.raises(ApiError) as exc:
            await update_role_permissions(
                application_id=app.id,
                role_id=role.id,
                payload=[perm.id],
                request=_mock_request(),
                session=session,
                principal=principal
            )
        assert exc.value.status_code == 422
        assert exc.value.code == "UNASSIGNABLE_PLATFORM_PERMISSION"

@pytest.mark.asyncio
async def test_disabled_role_contributes_no_permissions(session):
    """A disabled role remains stored in local role assignments but is filtered from effective queries."""
    from iitd_iam.api.v1.routes import list_role_assignments
    app = await _make_app(session, "app-d")
    role = Role(application_id=app.id, key="role-disabled", name="Role Disabled", scope=RoleScope.application, is_active=False)
    user = await _make_user(session, "u@d.com")
    session.add(role)
    await session.commit()

    # Assign role to user
    asgn = UserRoleAssignment(user_id=user.id, role_id=role.id, application_id=app.id, status=GrantStatus.active, source=AssignmentSource.manual)
    session.add(asgn)
    await session.commit()

    # Query effective role assignments
    assignments = await list_role_assignments(user_id=user.id, session=session)
    assert len(assignments) == 0  # filtered out because role.is_active is False

@pytest.mark.asyncio
async def test_suspended_application_mutation_policy(session):
    """Suspended application allows read-only administration. Blocks new roles and permission mapping changes."""
    app = await _make_app(session, "app-e", status=ApplicationStatus.suspended)
    role = Role(application_id=app.id, key="role-e", name="Role E", scope=RoleScope.application, is_active=True)
    session.add(role)
    await session.commit()

    principal = _principal(roles={"super_admin"}, permissions={"*"})

    from iitd_iam.api.v1.routes import create_application_role, update_role_permissions
    with patch("iitd_iam.api.v1.routes.get_settings", return_value=_settings()):
        with pytest.raises(ApiError) as exc_create:
            await create_application_role(
                application_id=app.id,
                payload=RoleCreate(key="new-role", name="New"),
                request=_mock_request(),
                session=session,
                principal=principal
            )
        assert exc_create.value.status_code == 409

        with pytest.raises(ApiError) as exc_perm:
            await update_role_permissions(
                application_id=app.id,
                role_id=role.id,
                payload=[],
                request=_mock_request(),
                session=session,
                principal=principal
            )
        assert exc_perm.value.status_code == 409

@pytest.mark.asyncio
async def test_archived_application_is_readonly(session):
    """Archived application blocks all updates including role metadata patching."""
    app = await _make_app(session, "app-f", status=ApplicationStatus.archived)
    role = Role(application_id=app.id, key="role-f", name="Role F", scope=RoleScope.application, is_active=True)
    session.add(role)
    await session.commit()

    principal = _principal(roles={"super_admin"}, permissions={"*"})

    from iitd_iam.api.v1.routes import update_application_role
    with patch("iitd_iam.api.v1.routes.get_settings", return_value=_settings()):
        with pytest.raises(ApiError) as exc:
            await update_application_role(
                application_id=app.id,
                role_id=role.id,
                payload=RoleUpdate(name="Renamed"),
                request=_mock_request(),
                session=session,
                principal=principal
            )
        assert exc.value.status_code == 422

@pytest.mark.asyncio
async def test_revocation_preserves_assignment_history(session):
    """Access revocation marks access grant and role assignments revoked instead of deleting them."""
    app = await _make_app(session, "app-g")
    user = await _make_user(session, "u@g.com")
    role = Role(application_id=app.id, key="role-g", name="Role G", scope=RoleScope.application, is_active=True)
    session.add(role)
    await session.commit()

    grant = ApplicationAccessGrant(application_id=app.id, user_id=user.id, status=GrantStatus.active)
    asgn = UserRoleAssignment(user_id=user.id, role_id=role.id, application_id=app.id, status=GrantStatus.active, source=AssignmentSource.manual)
    session.add_all([grant, asgn])
    await session.commit()

    principal = _principal(roles={"super_admin"}, permissions={"*"})

    from iitd_iam.api.v1.routes import revoke_application_access_grant
    with patch("iitd_iam.api.v1.routes.get_settings", return_value=_settings()):
        await revoke_application_access_grant(
            application_id=app.id,
            grant_id=grant.id,
            request=_mock_request(),
            session=session,
            principal=principal
        )

    # Reload records
    await session.refresh(grant)
    await session.refresh(asgn)

    assert grant.status == GrantStatus.revoked
    assert asgn.status == GrantStatus.revoked  # assignment is marked revoked for history, not deleted

@pytest.mark.asyncio
async def test_admin_cannot_read_another_app_grants(session):
    """Application admin cannot view grants/audit events for another application they do not manage."""
    app_a = await _make_app(session, "app-a-manage")
    app_b = await _make_app(session, "app-b-other")
    user = await _make_user(session, "admin@a.com")

    # Admin only manages app_a
    grant = ApplicationAccessGrant(application_id=app_a.id, user_id=user.id, status=GrantStatus.active)
    session.add(grant)
    await session.commit()

    principal = CurrentPrincipal(subject=str(uuid4()), issuer="dev", email="admin@a.com", user_id=user.id, roles={"application_admin"})

    from iitd_iam.api.v1.routes import list_application_access_grants
    with patch("iitd_iam.api.v1.routes.get_settings", return_value=_settings()):
        with pytest.raises(ApiError) as exc:
            await list_application_access_grants(
                application_id=app_b.id,
                session=session,
                principal=principal
            )
        assert exc.value.status_code == 403

# ===========================================================================
# GNS Idempotency & Failure Tests
# ===========================================================================

@pytest.mark.asyncio
async def test_gns_bootstrap_fails_when_app_missing():
    """GNS bootstrap CLI command fails if the gns-notification-service application is missing."""
    from unittest.mock import MagicMock
    from iitd_iam.cli import bootstrap_gns_rbac
    with patch("iitd_iam.cli.SessionLocal") as mock_session_local:
        session_mock = AsyncMock()
        session_mock.scalar.return_value = None
        session_mock.in_transaction = MagicMock(return_value=False)
        
        # Mock begin context manager properly using MagicMock so it directly returns the context manager
        class AsyncContextManagerMock:
            async def __aenter__(self):
                return self
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                pass
        session_mock.begin = MagicMock(return_value=AsyncContextManagerMock())
        session_mock.begin_nested = MagicMock(return_value=AsyncContextManagerMock())

        session_mock.__aenter__.return_value = session_mock
        mock_session_local.return_value = session_mock
        
        with pytest.raises(SystemExit) as sysexit:
            await bootstrap_gns_rbac()
        assert sysexit.value.code == 1


@pytest.mark.asyncio
async def test_gns_bootstrap_idempotency(session):
    """Verify GNS bootstrap runs successfully, creates roles/permissions, maps them, and is idempotent."""
    app = await _make_app(session, "gns-notification-service")
    
    from iitd_iam.cli import bootstrap_gns_rbac
    
    # Run first time
    with patch("iitd_iam.cli.SessionLocal", return_value=session):
        # Prevent SessionLocal context exit from closing our test session
        session.close = AsyncMock()
        await bootstrap_gns_rbac()

    # Verify roles created
    roles = (await session.scalars(select(Role).where(Role.application_id == app.id))).all()
    assert len(roles) == 4
    role_keys = {r.key for r in roles}
    assert role_keys == {"gns_admin", "gns_operator", "gns_developer", "gns_viewer"}

    # Verify mappings
    admin_role = [r for r in roles if r.key == "gns_admin"][0]
    mappings_count = await session.scalar(
        select(func.count())
        .select_from(RolePermission)
        .where(RolePermission.role_id == admin_role.id)
    )
    assert mappings_count == 13

    # Run second time - should be completely idempotent and change nothing
    with patch("iitd_iam.cli.SessionLocal", return_value=session):
        await bootstrap_gns_rbac()

    # Counts should remain the same
    roles_after = (await session.scalars(select(Role).where(Role.application_id == app.id))).all()
    assert len(roles_after) == 4
    mappings_count_after = await session.scalar(
        select(func.count())
        .select_from(RolePermission)
        .where(RolePermission.role_id == admin_role.id)
    )
    assert mappings_count_after == 13
import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ===========================================================================
# Tests for IAM-009 Dynamic Application-Scoped Permissions
# ===========================================================================
from iitd_iam.api.v1.routes import (
    create_application_permission,
    update_application_permission,
    get_application_permission,
    list_application_permissions,
    update_role_permissions,
    create_application_role,
)
from iitd_iam.schemas import PermissionCreate, PermissionUpdate, RoleCreate

@pytest.mark.asyncio
async def test_dynamic_permission_creation_and_update(session):
    """Test creating, listing, and updating application permissions."""
    app = await _make_app(session, "dyn-perm-app")
    user = await _make_user(session, "admin@dyn.com")
    principal = _principal(
        permissions={"permissions.create", "permissions.view", "permissions.update", "roles.create", "roles.update"},
        user_id=user.id
    )

    # Needs grant to pass verify_application_admin
    grant = ApplicationAccessGrant(application_id=app.id, user_id=user.id, status=GrantStatus.active)
    session.add(grant)
    await session.commit()

    # Create Permission
    perm = await create_application_permission(
        application_id=app.id,
        payload=PermissionCreate(
            key="docs.read",
            name="Read Docs",
            description="Allows reading docs",
            resource="docs",
            action="read"
        ),
        request=_mock_request(),
        session=session,
        principal=principal,
    )
    assert perm.key == "docs.read"
    assert perm.is_active is True
    assert perm.application_id == app.id

    # List Permissions
    perms = await list_application_permissions(application_id=app.id, session=session, principal=principal)
    assert len(perms) == 1
    assert perms[0].key == "docs.read"

    # Update Permission (disable it)
    updated = await update_application_permission(
        application_id=app.id,
        permission_id=perm.id,
        payload=PermissionUpdate(is_active=False),
        request=_mock_request(),
        session=session,
        principal=principal,
    )
    assert updated.is_active is False

    # Create Role and try to assign disabled permission
    role = await create_application_role(
        application_id=app.id,
        payload=RoleCreate(key="doc_reader", name="Reader"),
        request=_mock_request(),
        session=session,
        principal=principal,
    )

    from iitd_iam.errors import ApiError
    with pytest.raises(ApiError) as exc_info:
        await update_role_permissions(
            application_id=app.id,
            role_id=role.id,
            payload=[perm.id],
            request=_mock_request(),
            session=session,
            principal=principal,
        )
    assert exc_info.value.status_code == 422
    assert "disabled" in exc_info.value.message.lower()

