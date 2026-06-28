from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from iitd_iam.auth.dependencies import current_principal, require_permission
from iitd_iam.auth.identity import CurrentPrincipal
from iitd_iam.auth.permissions import can_assign_role
from iitd_iam.auth.redirects import RedirectValidationError, validate_redirect_uri
from iitd_iam.database import get_session
from iitd_iam.errors import ApiError
from iitd_iam.models import (
    Application,
    ApplicationAccessGrant,
    ApplicationEnvironment,
    AuditEvent,
    Invitation,
    RedirectUri,
    Role,
    User,
    UserStatus,
)
from iitd_iam.schemas import (
    ApplicationCreate,
    ApplicationOut,
    EnvironmentCreate,
    EnvironmentOut,
    GrantCreate,
    InvitationCreate,
    InvitationOut,
    RedirectUriCreate,
    UserCreate,
    UserOut,
)

router = APIRouter()


@router.get("/me")
async def me(principal: CurrentPrincipal = Depends(current_principal)):
    return {"subject": principal.subject, "issuer": principal.issuer, "email": principal.email, "roles": sorted(principal.roles)}


@router.get("/users", dependencies=[Depends(require_permission("users.view"))])
async def list_users(session: AsyncSession = Depends(get_session)) -> list[UserOut]:
    return (await session.scalars(select(User).order_by(User.created_at.desc()).limit(100))).all()


@router.post("/users", response_model=UserOut, dependencies=[Depends(require_permission("users.create"))])
async def create_user(payload: UserCreate, session: AsyncSession = Depends(get_session)):
    normalized = payload.email.strip().lower()
    user = User(
        identity_issuer="pending",
        identity_subject=f"pending:{normalized}",
        email=payload.email,
        normalized_email=normalized,
        display_name=payload.display_name,
        status=UserStatus.invited,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.get("/users/{user_id}", response_model=UserOut, dependencies=[Depends(require_permission("users.view"))])
async def get_user(user_id: UUID, session: AsyncSession = Depends(get_session)):
    user = await session.get(User, user_id)
    if not user:
        raise ApiError("USER_NOT_FOUND", "User was not found.", status_code=404)
    return user


@router.post("/users/{user_id}/suspend", dependencies=[Depends(require_permission("users.suspend"))])
async def suspend_user(user_id: UUID, session: AsyncSession = Depends(get_session)):
    user = await session.get(User, user_id)
    if not user:
        raise ApiError("USER_NOT_FOUND", "User was not found.", status_code=404)
    user.status = UserStatus.suspended
    await session.commit()
    return {"status": "suspended"}


@router.get("/applications", dependencies=[Depends(require_permission("applications.view"))])
async def list_applications(session: AsyncSession = Depends(get_session)) -> list[ApplicationOut]:
    return (await session.scalars(select(Application).order_by(Application.created_at.desc()).limit(100))).all()


@router.post("/applications", response_model=ApplicationOut, dependencies=[Depends(require_permission("applications.create"))])
async def create_application(payload: ApplicationCreate, session: AsyncSession = Depends(get_session)):
    app = Application(**payload.model_dump())
    session.add(app)
    await session.commit()
    await session.refresh(app)
    return app


@router.get("/applications/{application_id}", response_model=ApplicationOut, dependencies=[Depends(require_permission("applications.view"))])
async def get_application(application_id: UUID, session: AsyncSession = Depends(get_session)):
    app = await session.get(Application, application_id)
    if not app:
        raise ApiError("APPLICATION_NOT_FOUND", "Application was not found.", status_code=404)
    return app


@router.post("/applications/{application_id}/environments", response_model=EnvironmentOut, dependencies=[Depends(require_permission("applications.update"))])
async def create_environment(application_id: UUID, payload: EnvironmentCreate, session: AsyncSession = Depends(get_session)):
    if not await session.get(Application, application_id):
        raise ApiError("APPLICATION_NOT_FOUND", "Application was not found.", status_code=404)
    env = ApplicationEnvironment(application_id=application_id, **payload.model_dump(mode="json"))
    session.add(env)
    await session.commit()
    await session.refresh(env)
    return env


@router.post("/clients/{environment_id}/redirect-uris", dependencies=[Depends(require_permission("applications.update"))])
async def add_redirect_uri(environment_id: UUID, payload: RedirectUriCreate, session: AsyncSession = Depends(get_session)):
    try:
        validate_redirect_uri(payload.redirect_uri, environment=payload.environment.value)
    except RedirectValidationError as exc:
        raise ApiError("REDIRECT_URI_INVALID", str(exc), status_code=422) from exc
    redirect = RedirectUri(application_environment_id=environment_id, redirect_uri=payload.redirect_uri, type=payload.type)
    session.add(redirect)
    await session.commit()
    return {"id": redirect.id, "redirect_uri": redirect.redirect_uri, "type": redirect.type}


@router.post("/applications/{application_id}/users", dependencies=[Depends(require_permission("application_access.grant"))])
async def grant_application_access(application_id: UUID, payload: GrantCreate, session: AsyncSession = Depends(get_session)):
    grant = ApplicationAccessGrant(application_id=application_id, user_id=payload.user_id, status=payload.status)
    session.add(grant)
    await session.commit()
    return {"id": grant.id, "status": grant.status}


@router.post("/users/{user_id}/role-assignments", dependencies=[Depends(require_permission("roles.assign"))])
async def assign_role(user_id: UUID, role_id: UUID, principal: CurrentPrincipal = Depends(current_principal), session: AsyncSession = Depends(get_session)):
    role = await session.get(Role, role_id)
    if not role:
        raise ApiError("ROLE_NOT_FOUND", "Role was not found.", status_code=404)
    if role.scope == "platform" and not can_assign_role(principal.roles, role.key):
        raise ApiError("PRIVILEGE_ESCALATION_DENIED", "A lower role cannot assign this platform role.", status_code=403)
    return {"user_id": user_id, "role_id": role_id, "status": "accepted"}


@router.get("/invitations", dependencies=[Depends(require_permission("invitations.view"))])
async def list_invitations(session: AsyncSession = Depends(get_session)) -> list[InvitationOut]:
    return (await session.scalars(select(Invitation).order_by(Invitation.created_at.desc()).limit(100))).all()


@router.post("/invitations", dependencies=[Depends(require_permission("invitations.create"))])
async def create_invitation(payload: InvitationCreate, session: AsyncSession = Depends(get_session)):
    token = token_urlsafe(32)
    invitation = Invitation(
        email=payload.email,
        normalized_email=payload.email.strip().lower(),
        application_id=payload.application_id,
        role_id=payload.role_id,
        token_hash=sha256(token.encode()).hexdigest(),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(invitation)
    await session.commit()
    return {"id": invitation.id, "status": invitation.status, "acceptance_token": token}


@router.get("/audit-events", dependencies=[Depends(require_permission("audit.view"))])
async def list_audit_events(session: AsyncSession = Depends(get_session)):
    total = await session.scalar(select(func.count()).select_from(AuditEvent))
    items = (await session.scalars(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(100))).all()
    return {"items": items, "total": total}

