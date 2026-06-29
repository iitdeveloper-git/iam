"""
Test suite for the invitation acceptance flow (IAM-003).

Uses SQLite in-memory DB via pytest-asyncio + AsyncSession.
The conftest.py sets IAM_DATABASE_URL before any module-level import
that triggers get_settings().

PostgreSQL concurrency tests are marked @pytest.mark.integration and
require TEST_DATABASE_URL pointing to a real PostgreSQL instance.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
import pytest_asyncio
from pydantic import PostgresDsn
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from iitd_iam.database import Base

from iitd_iam.models import (  # noqa: E402
    Application,
    ApplicationAccessGrant,
    ApplicationStatus,
    AssignmentSource,
    AuthorizationMode,
    GrantStatus,
    Invitation,
    InvitationStatus,
    Role,
    RoleScope,
    User,
    UserRoleAssignment,
    UserStatus,
)
from iitd_iam.auth.identity import CurrentPrincipal
from iitd_iam.config import Settings
from iitd_iam.errors import ApiError
from iitd_iam.schemas import InvitationAcceptRequest, RoleCreate, InvitationCreate


def _settings() -> Settings:
    return Settings(
        database_url=PostgresDsn("postgresql://iam:iam@localhost:5432/iam"),
        keycloak_base_url="https://auth.example.com",
        environment="test",
    )


# ---------------------------------------------------------------------------
# Engine / Session fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        # Create only tables needed by invitation flow tests.
        # Excluded:
        #   redirect_uris — PostgreSQL-only CHECK using position()
        #   audit_events  — uses JSONB which SQLite does not support
        #   service_accounts, session_projections — not used in these tests
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
    """Replace log_audit_event with a no-op for all tests.
    The audit_events table uses JSONB which SQLite doesn't support.
    Audit logging behavior is tested separately in integration tests.
    """
    async def _noop(*args, **kwargs):
        return None
    monkeypatch.setattr("iitd_iam.api.v1.routes.log_audit_event", _noop)
    monkeypatch.setattr("iitd_iam.observability.audit.log_audit_event", _noop)


@pytest_asyncio.fixture
async def session(engine):
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        yield s


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _norm(email: str) -> str:
    return email.strip().lower()


def _invitation_token() -> tuple[str, str]:
    raw = token_urlsafe(32)
    return raw, sha256(raw.encode()).hexdigest()


def _principal(email: str = "user@example.com", subject: str | None = None) -> CurrentPrincipal:
    return CurrentPrincipal(
        subject=subject or str(uuid4()),
        issuer="https://keycloak.example.com/realms/iitd",
        email=email,
        roles={"user"},
    )


async def _make_application(session: AsyncSession, status: ApplicationStatus = ApplicationStatus.active) -> Application:
    app = Application(
        key=f"test-app-{uuid4().hex[:8]}",
        name="Test Application",
        authorization_mode=AuthorizationMode.application_access,
        status=status,
    )
    session.add(app)
    await session.commit()
    await session.refresh(app)
    return app


async def _make_role(
    session: AsyncSession,
    app: Application | None,
    scope: RoleScope = RoleScope.application,
    key: str | None = None,
) -> Role:
    role = Role(
        key=key or f"role-{uuid4().hex[:6]}",
        name="Test Role",
        scope=scope,
        application_id=app.id if (scope == RoleScope.application and app) else None,
        is_system=False,
    )
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role


async def _make_platform_role(session: AsyncSession) -> Role:
    return await _make_role(session, app=None, scope=RoleScope.platform, key=f"platform-admin-{uuid4().hex[:4]}")


async def _make_invitation(
    session: AsyncSession,
    email: str = "user@example.com",
    application: Application | None = None,
    role: Role | None = None,
    status: InvitationStatus = InvitationStatus.pending,
    expires_delta: timedelta = timedelta(days=7),
) -> tuple[Invitation, str]:
    raw, token_hash = _invitation_token()
    inv = Invitation(
        email=email,
        normalized_email=_norm(email),
        application_id=application.id if application else None,
        role_id=role.id if role else None,
        token_hash=token_hash,
        status=status,
        expires_at=datetime.now(UTC) + expires_delta,
    )
    session.add(inv)
    await session.commit()
    await session.refresh(inv)
    return inv, raw


def _mock_request() -> AsyncMock:
    req = AsyncMock()
    req.state.request_id = "test-request-id"
    req.client = None
    req.headers = {}
    return req


async def _accept(session: AsyncSession, token: str, principal: CurrentPrincipal):
    from iitd_iam.api.v1.routes import accept_invitation
    with patch("iitd_iam.api.v1.routes.get_settings", return_value=_settings()):
        return await accept_invitation(
            payload=InvitationAcceptRequest(token=token),
            request=_mock_request(),
            session=session,
            principal=principal,
        )


# ===========================================================================
# Happy-path tests
# ===========================================================================

@pytest.mark.asyncio
async def test_accept_creates_user_grant_and_assignment(session):
    """Full happy path: pending invitation with app+role creates all three records."""
    from sqlalchemy import select as sel
    app = await _make_application(session)
    role = await _make_role(session, app)
    _, raw = await _make_invitation(session, application=app, role=role)

    result = await _accept(session, raw, _principal())

    assert result.status == "accepted"
    assert result.application is not None
    assert result.role_assignment is not None
    assert result.role_assignment.source == AssignmentSource.invitation

    user = await session.scalar(sel(User).where(User.normalized_email == "user@example.com"))
    assert user is not None

    grant = await session.scalar(
        sel(ApplicationAccessGrant)
        .where(ApplicationAccessGrant.user_id == user.id)
        .where(ApplicationAccessGrant.application_id == app.id)
    )
    assert grant is not None

    asgn = await session.scalar(
        sel(UserRoleAssignment)
        .where(UserRoleAssignment.user_id == user.id)
        .where(UserRoleAssignment.role_id == role.id)
    )
    assert asgn is not None
    assert asgn.source == AssignmentSource.invitation


@pytest.mark.asyncio
async def test_accept_reuses_existing_local_user(session):
    """Existing local IAM user (matched by keycloak_user_id) is reused — no duplicate."""
    from sqlalchemy import select as sel
    app = await _make_application(session)
    _, raw = await _make_invitation(session, application=app)
    subject = str(uuid4())
    existing = User(
        identity_issuer="https://keycloak.example.com/realms/iitd",
        identity_subject=subject,
        keycloak_user_id=subject,
        email="user@example.com",
        normalized_email="user@example.com",
        status=UserStatus.active,
    )
    session.add(existing)
    await session.commit()

    result = await _accept(session, raw, _principal(subject=subject))

    assert result.status == "accepted"
    count = await session.scalar(
        sel(__import__("sqlalchemy", fromlist=["func"]).func.count())
        .select_from(User).where(User.normalized_email == "user@example.com")
    )
    assert count == 1


@pytest.mark.asyncio
async def test_accept_without_role_grants_app_access_only(session):
    """Invitation without role_id → access grant created, zero role assignments."""
    from sqlalchemy import select as sel, func
    app = await _make_application(session)
    _, raw = await _make_invitation(session, application=app, role=None)

    result = await _accept(session, raw, _principal())

    assert result.role_assignment is None
    user = await session.scalar(sel(User).where(User.normalized_email == "user@example.com"))
    n = await session.scalar(sel(func.count()).select_from(UserRoleAssignment).where(UserRoleAssignment.user_id == user.id))
    assert n == 0


@pytest.mark.asyncio
async def test_second_acceptance_returns_409(session):
    """Second call to accept the same invitation → 409."""
    app = await _make_application(session)
    _, raw = await _make_invitation(session, application=app)
    await _accept(session, raw, _principal())

    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, _principal())
    assert exc_info.value.status_code == 409


# ===========================================================================
# Email / auth validation
# ===========================================================================

@pytest.mark.asyncio
async def test_email_mismatch_returns_403(session):
    app = await _make_application(session)
    _, raw = await _make_invitation(session, email="invited@example.com", application=app)
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, _principal(email="other@example.com"))
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "EMAIL_MISMATCH"


@pytest.mark.asyncio
async def test_missing_email_claim_returns_422(session):
    app = await _make_application(session)
    _, raw = await _make_invitation(session, application=app)
    principal = CurrentPrincipal(subject=str(uuid4()), issuer="dev", email=None, roles={"user"})
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, principal)
    assert exc_info.value.status_code == 422
    assert exc_info.value.code == "EMAIL_CLAIM_MISSING"


@pytest.mark.asyncio
async def test_unverified_email_rejected_when_required(session):
    """When require_email_verified=True, principal without email_verified → 403."""
    from unittest.mock import MagicMock
    app = await _make_application(session)
    _, raw = await _make_invitation(session, application=app)
    principal = _principal()  # has no email_verified attribute

    # Build a mock settings object with require_email_verified=True
    mock_settings = MagicMock()
    mock_settings.oidc_issuer = "https://keycloak.example.com/realms/iitd"
    mock_settings.require_email_verified = True

    from iitd_iam.api.v1.routes import accept_invitation
    with patch("iitd_iam.api.v1.routes.get_settings", return_value=mock_settings):
        with pytest.raises(ApiError) as exc_info:
            await accept_invitation(
                payload=InvitationAcceptRequest(token=raw),
                request=_mock_request(),
                session=session,
                principal=principal,
            )
    assert exc_info.value.status_code in (403, 422)


# ===========================================================================
# State validation
# ===========================================================================

@pytest.mark.asyncio
async def test_token_not_found_returns_404(session):
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, "nonexistent-token-xyz", _principal())
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_expired_invitation_returns_410(session):
    app = await _make_application(session)
    _, raw = await _make_invitation(session, application=app, expires_delta=timedelta(seconds=-1))
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, _principal())
    assert exc_info.value.status_code == 410
    assert exc_info.value.code == "INVITATION_EXPIRED"


@pytest.mark.asyncio
async def test_already_accepted_returns_409(session):
    app = await _make_application(session)
    _, raw = await _make_invitation(session, application=app, status=InvitationStatus.accepted)
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, _principal())
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_revoked_returns_410(session):
    app = await _make_application(session)
    _, raw = await _make_invitation(session, application=app, status=InvitationStatus.revoked)
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, _principal())
    assert exc_info.value.status_code == 410


@pytest.mark.asyncio
async def test_suspended_application_returns_409(session):
    app = await _make_application(session, status=ApplicationStatus.suspended)
    _, raw = await _make_invitation(session, application=app)
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, _principal())
    assert exc_info.value.status_code == 409
    assert exc_info.value.code == "APPLICATION_SUSPENDED"


@pytest.mark.asyncio
async def test_archived_application_returns_410(session):
    app = await _make_application(session, status=ApplicationStatus.archived)
    _, raw = await _make_invitation(session, application=app)
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, _principal())
    assert exc_info.value.status_code == 410
    assert exc_info.value.code == "APPLICATION_ARCHIVED"


# ===========================================================================
# Scope validation
# ===========================================================================

@pytest.mark.asyncio
async def test_role_from_different_app_returns_422(session):
    app_a = await _make_application(session)
    app_b = await _make_application(session)
    role_b = await _make_role(session, app_b)
    _, raw = await _make_invitation(session, application=app_a, role=role_b)
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, _principal())
    assert exc_info.value.status_code == 422
    assert exc_info.value.code == "ROLE_APPLICATION_MISMATCH"


@pytest.mark.asyncio
async def test_platform_role_via_invitation_returns_422(session):
    app = await _make_application(session)
    plat = await _make_platform_role(session)
    _, raw = await _make_invitation(session, application=app, role=plat)
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, _principal())
    assert exc_info.value.status_code == 422
    assert exc_info.value.code == "PLATFORM_ROLE_VIA_INVITATION"


@pytest.mark.asyncio
async def test_app_role_without_application_in_invitation_returns_422(session):
    app = await _make_application(session)
    role = await _make_role(session, app)
    _, raw = await _make_invitation(session, application=None, role=role)
    with pytest.raises(ApiError) as exc_info:
        await _accept(session, raw, _principal())
    assert exc_info.value.status_code == 422
    assert exc_info.value.code == "ROLE_WITHOUT_APPLICATION"


# ===========================================================================
# Uniqueness / partial index tests
# ===========================================================================

@pytest.mark.asyncio
async def test_platform_role_duplicate_prevented(session):
    """UNIQUE partial index prevents duplicate platform-role assignment."""
    from sqlalchemy.exc import IntegrityError
    plat = await _make_platform_role(session)
    user = User(
        identity_issuer="dev", identity_subject="s1",
        keycloak_user_id="s1", email="u@e.com", normalized_email="u@e.com",
        status=UserStatus.active,
    )
    session.add(user)
    await session.commit()

    session.add(UserRoleAssignment(user_id=user.id, role_id=plat.id, application_id=None,
                                   status=GrantStatus.active, source=AssignmentSource.manual))
    await session.commit()

    session.add(UserRoleAssignment(user_id=user.id, role_id=plat.id, application_id=None,
                                   status=GrantStatus.active, source=AssignmentSource.manual))
    with pytest.raises(IntegrityError):
        await session.commit()
    await session.rollback()


@pytest.mark.asyncio
async def test_application_role_duplicate_prevented(session):
    """UNIQUE partial index prevents duplicate application-role assignment."""
    from sqlalchemy.exc import IntegrityError
    app = await _make_application(session)
    role = await _make_role(session, app)
    user = User(
        identity_issuer="dev", identity_subject="s2",
        keycloak_user_id="s2", email="u2@e.com", normalized_email="u2@e.com",
        status=UserStatus.active,
    )
    session.add(user)
    await session.commit()

    session.add(UserRoleAssignment(user_id=user.id, role_id=role.id, application_id=app.id,
                                   status=GrantStatus.active, source=AssignmentSource.manual))
    await session.commit()

    session.add(UserRoleAssignment(user_id=user.id, role_id=role.id, application_id=app.id,
                                   status=GrantStatus.active, source=AssignmentSource.manual))
    with pytest.raises(IntegrityError):
        await session.commit()
    await session.rollback()


# ===========================================================================
# Application lifecycle enforcement
# ===========================================================================

@pytest.mark.asyncio
async def test_cannot_invite_to_suspended_application(session):
    app = await _make_application(session, status=ApplicationStatus.suspended)
    from iitd_iam.api.v1.routes import create_invitation
    with patch("iitd_iam.api.v1.routes.get_settings", return_value=_settings()):
        with pytest.raises(ApiError) as exc_info:
            await create_invitation(
                payload=InvitationCreate(email="u@e.com", application_id=app.id),
                request=_mock_request(),
                session=session,
                principal=_principal(),
            )
    assert exc_info.value.status_code == 409
    assert exc_info.value.code == "APPLICATION_SUSPENDED"


@pytest.mark.asyncio
async def test_cannot_create_role_for_archived_application(session):
    app = await _make_application(session, status=ApplicationStatus.archived)
    from iitd_iam.api.v1.routes import create_application_role
    admin = CurrentPrincipal(subject=str(uuid4()), issuer="dev", email="a@e.com", roles={"super_admin"}, permissions={"*"})
    with patch("iitd_iam.api.v1.routes.get_settings", return_value=_settings()):
        with pytest.raises(ApiError) as exc_info:
            await create_application_role(
                application_id=app.id,
                payload=RoleCreate(key="new-role", name="New Role"),
                request=_mock_request(),
                session=session,
                principal=admin,
            )
    assert exc_info.value.status_code == 422
    assert exc_info.value.code == "APPLICATION_ARCHIVED"
