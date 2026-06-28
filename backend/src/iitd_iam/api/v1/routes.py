from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from iitd_iam.auth.dependencies import current_principal, require_permission, get_keycloak_client
from iitd_iam.auth.identity import CurrentPrincipal
from iitd_iam.auth.permissions import can_assign_role
from iitd_iam.auth.redirects import RedirectValidationError, validate_redirect_uri
from iitd_iam.database import get_session
from iitd_iam.errors import ApiError
from iitd_iam.config import get_settings
from iitd_iam.integrations.keycloak.client import KeycloakHttpClient
from iitd_iam.integrations.keycloak.schemas import (
    KeycloakUserCreate,
    KeycloakUserUpdate,
    KeycloakClientCreate,
)
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
    ClientType,
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
from iitd_iam.observability.audit import log_audit_event

router = APIRouter()


@router.get("/me")
async def me(principal: CurrentPrincipal = Depends(current_principal)):
    return {
        "subject": principal.subject,
        "issuer": principal.issuer,
        "email": principal.email,
        "roles": list(principal.roles),
    }


@router.get("/users", response_model=list[UserOut], dependencies=[Depends(require_permission("users.view"))])
async def list_users(session: AsyncSession = Depends(get_session)) -> list[UserOut]:
    return (await session.scalars(select(User).order_by(User.created_at.desc()).limit(100))).all()


@router.post("/users", response_model=UserOut, dependencies=[Depends(require_permission("users.create"))])
async def create_user(
    payload: UserCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    keycloak: KeycloakHttpClient = Depends(get_keycloak_client),
    principal: CurrentPrincipal = Depends(current_principal),
):
    normalized = payload.email.strip().lower()
    existing = await session.scalar(select(User).where(User.normalized_email == normalized))
    if existing:
        raise ApiError("USER_ALREADY_EXISTS", "A user with this email already exists.", status_code=400)

    names = (payload.display_name or "").strip().split(maxsplit=1)
    first_name = names[0] if names else ""
    last_name = names[1] if len(names) > 1 else ""

    settings = get_settings()
    issuer_url = str(settings.oidc_issuer)

    try:
        kc_payload = KeycloakUserCreate(
            email=payload.email,
            first_name=first_name,
            last_name=last_name,
            enabled=True,
            email_verified=False,
            required_actions=["UPDATE_PASSWORD", "VERIFY_EMAIL"]
        )
        keycloak_user_id = await keycloak.create_user(kc_payload)
    except Exception as exc:
        raise ApiError("KEYCLOAK_PROVISIONING_FAILED", f"Could not create user in Keycloak: {str(exc)}", status_code=500)

    user = User(
        identity_issuer=issuer_url,
        identity_subject=keycloak_user_id,
        keycloak_user_id=keycloak_user_id,
        email=payload.email,
        normalized_email=normalized,
        display_name=payload.display_name,
        first_name=first_name,
        last_name=last_name,
        status=UserStatus.invited,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    await log_audit_event(
        session,
        action="user.create",
        resource_type="user",
        resource_id=str(user.id),
        result="success",
        principal=principal,
        after_summary={"email": user.email, "display_name": user.display_name, "keycloak_user_id": keycloak_user_id},
        request=request
    )
    await session.commit()
    return user


@router.get("/users/{user_id}", response_model=UserOut, dependencies=[Depends(require_permission("users.view"))])
async def get_user(user_id: UUID, session: AsyncSession = Depends(get_session)):
    user = await session.get(User, user_id)
    if not user:
        raise ApiError("USER_NOT_FOUND", "User was not found.", status_code=404)
    return user


@router.post("/users/{user_id}/suspend", dependencies=[Depends(require_permission("users.suspend"))])
async def suspend_user(
    user_id: UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    keycloak: KeycloakHttpClient = Depends(get_keycloak_client),
    principal: CurrentPrincipal = Depends(current_principal),
):
    user = await session.get(User, user_id)
    if not user:
        raise ApiError("USER_NOT_FOUND", "User was not found.", status_code=404)

    before_status = user.status
    if user.keycloak_user_id:
        try:
            await keycloak.disable_user(user.keycloak_user_id)
        except Exception as exc:
            raise ApiError("KEYCLOAK_ACTION_FAILED", f"Could not disable user in Keycloak: {str(exc)}", status_code=500)

    user.status = UserStatus.suspended
    await session.commit()

    await log_audit_event(
        session,
        action="user.suspend",
        resource_type="user",
        resource_id=str(user.id),
        result="success",
        principal=principal,
        before_summary={"status": before_status},
        after_summary={"status": UserStatus.suspended},
        request=request
    )
    await session.commit()
    return {"status": "suspended"}


@router.post("/users/{user_id}/restore", dependencies=[Depends(require_permission("users.update"))])
async def restore_user(
    user_id: UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    keycloak: KeycloakHttpClient = Depends(get_keycloak_client),
    principal: CurrentPrincipal = Depends(current_principal),
):
    user = await session.get(User, user_id)
    if not user:
        raise ApiError("USER_NOT_FOUND", "User was not found.", status_code=404)

    before_status = user.status
    if user.keycloak_user_id:
        try:
            await keycloak.enable_user(user.keycloak_user_id)
        except Exception as exc:
            raise ApiError("KEYCLOAK_ACTION_FAILED", f"Could not enable user in Keycloak: {str(exc)}", status_code=500)

    user.status = UserStatus.active
    await session.commit()

    await log_audit_event(
        session,
        action="user.restore",
        resource_type="user",
        resource_id=str(user.id),
        result="success",
        principal=principal,
        before_summary={"status": before_status},
        after_summary={"status": UserStatus.active},
        request=request
    )
    await session.commit()
    return {"status": "active"}


@router.get("/users/{user_id}/sessions", dependencies=[Depends(require_permission("users.view"))])
async def list_user_sessions(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
    keycloak: KeycloakHttpClient = Depends(get_keycloak_client),
):
    user = await session.get(User, user_id)
    if not user:
        raise ApiError("USER_NOT_FOUND", "User was not found.", status_code=404)

    if not user.keycloak_user_id:
        return []

    try:
        sessions = await keycloak.list_user_sessions(user.keycloak_user_id)
        return sessions
    except Exception as exc:
        raise ApiError("KEYCLOAK_ACTION_FAILED", f"Could not fetch user sessions from Keycloak: {str(exc)}", status_code=500)


@router.post("/users/{user_id}/sessions/revoke", dependencies=[Depends(require_permission("users.suspend"))])
async def revoke_user_sessions(
    user_id: UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    keycloak: KeycloakHttpClient = Depends(get_keycloak_client),
    principal: CurrentPrincipal = Depends(current_principal),
):
    user = await session.get(User, user_id)
    if not user:
        raise ApiError("USER_NOT_FOUND", "User was not found.", status_code=404)

    if user.keycloak_user_id:
        try:
            await keycloak.revoke_user_sessions(user.keycloak_user_id)
        except Exception as exc:
            raise ApiError("KEYCLOAK_ACTION_FAILED", f"Could not revoke user sessions in Keycloak: {str(exc)}", status_code=500)

    await log_audit_event(
        session,
        action="user.sessions.revoke",
        resource_type="user",
        resource_id=str(user.id),
        result="success",
        principal=principal,
        request=request
    )
    await session.commit()
    return {"status": "revoked"}


@router.get("/applications", response_model=list[ApplicationOut], dependencies=[Depends(require_permission("applications.view"))])
async def list_applications(session: AsyncSession = Depends(get_session)) -> list[ApplicationOut]:
    return (await session.scalars(select(Application).order_by(Application.created_at.desc()).limit(100))).all()


@router.post("/applications", response_model=ApplicationOut, dependencies=[Depends(require_permission("applications.create"))])
async def create_application(
    payload: ApplicationCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    principal: CurrentPrincipal = Depends(current_principal),
):
    existing = await session.scalar(select(Application).where(Application.key == payload.key))
    if existing:
        raise ApiError("APPLICATION_ALREADY_EXISTS", "An application with this key already exists.", status_code=400)

    app = Application(**payload.model_dump())
    session.add(app)
    await session.commit()
    await session.refresh(app)

    await log_audit_event(
        session,
        action="application.create",
        resource_type="application",
        resource_id=str(app.id),
        result="success",
        principal=principal,
        application_id=app.id,
        after_summary={"key": app.key, "name": app.name, "authorization_mode": app.authorization_mode.value},
        request=request
    )
    await session.commit()
    return app


@router.get("/applications/{application_id}", response_model=ApplicationOut, dependencies=[Depends(require_permission("applications.view"))])
async def get_application(application_id: UUID, session: AsyncSession = Depends(get_session)):
    app = await session.get(Application, application_id)
    if not app:
        raise ApiError("APPLICATION_NOT_FOUND", "Application was not found.", status_code=404)
    return app


@router.post("/applications/{application_id}/environments", response_model=EnvironmentOut, dependencies=[Depends(require_permission("applications.update"))])
async def create_environment(
    application_id: UUID,
    payload: EnvironmentCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    keycloak: KeycloakHttpClient = Depends(get_keycloak_client),
    principal: CurrentPrincipal = Depends(current_principal),
):
    app = await session.get(Application, application_id)
    if not app:
        raise ApiError("APPLICATION_NOT_FOUND", "Application was not found.", status_code=404)

    existing = await session.scalar(
        select(ApplicationEnvironment)
        .where(ApplicationEnvironment.application_id == application_id)
        .where(ApplicationEnvironment.environment == payload.environment)
    )
    if existing:
        raise ApiError("ENVIRONMENT_ALREADY_EXISTS", "This environment is already configured for the application.", status_code=400)

    is_public = payload.client_type == ClientType.public
    try:
        kc_payload = KeycloakClientCreate(
            client_id=payload.client_id,
            name=f"{app.name} ({payload.environment.value})",
            public_client=is_public,
            standard_flow_enabled=True,
            redirect_uris=["http://localhost:3000/*"],
            web_origins=["http://localhost:3000"]
        )
        await keycloak.create_client(kc_payload)
    except Exception as exc:
        raise ApiError("KEYCLOAK_PROVISIONING_FAILED", f"Could not create client in Keycloak: {str(exc)}", status_code=500)

    env = ApplicationEnvironment(application_id=application_id, **payload.model_dump(mode="json"))
    session.add(env)
    await session.commit()
    await session.refresh(env)

    await log_audit_event(
        session,
        action="application.environment.create",
        resource_type="environment",
        resource_id=str(env.id),
        result="success",
        principal=principal,
        application_id=application_id,
        after_summary={"environment": env.environment.value, "client_id": env.client_id, "client_type": env.client_type.value},
        request=request
    )
    await session.commit()
    return env


@router.post("/clients/{environment_id}/redirect-uris", dependencies=[Depends(require_permission("applications.update"))])
async def add_redirect_uri(
    environment_id: UUID,
    payload: RedirectUriCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    principal: CurrentPrincipal = Depends(current_principal),
):
    try:
        validate_redirect_uri(payload.redirect_uri, environment=payload.environment.value)
    except RedirectValidationError as exc:
        raise ApiError("REDIRECT_URI_INVALID", str(exc), status_code=422) from exc

    redirect = RedirectUri(application_environment_id=environment_id, redirect_uri=payload.redirect_uri, type=payload.type)
    session.add(redirect)
    await session.commit()

    await log_audit_event(
        session,
        action="application.redirect_uri.add",
        resource_type="redirect_uri",
        resource_id=str(redirect.id),
        result="success",
        principal=principal,
        after_summary={"redirect_uri": redirect.redirect_uri, "type": redirect.type},
        request=request
    )
    await session.commit()
    return {"id": redirect.id, "redirect_uri": redirect.redirect_uri, "type": redirect.type}


@router.post("/applications/{application_id}/users", dependencies=[Depends(require_permission("application_access.grant"))])
async def grant_application_access(
    application_id: UUID,
    payload: GrantCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    principal: CurrentPrincipal = Depends(current_principal),
):
    grant = ApplicationAccessGrant(application_id=application_id, user_id=payload.user_id, status=payload.status)
    session.add(grant)
    await session.commit()

    await log_audit_event(
        session,
        action="application.access.grant",
        resource_type="application_access_grant",
        resource_id=str(grant.id),
        result="success",
        principal=principal,
        application_id=application_id,
        after_summary={"user_id": str(payload.user_id), "status": grant.status.value},
        request=request
    )
    await session.commit()
    return {"id": grant.id, "status": grant.status}


@router.post("/users/{user_id}/role-assignments", dependencies=[Depends(require_permission("roles.assign"))])
async def assign_role(
    user_id: UUID,
    role_id: UUID,
    request: Request,
    principal: CurrentPrincipal = Depends(current_principal),
    session: AsyncSession = Depends(get_session)
):
    role = await session.get(Role, role_id)
    if not role:
        raise ApiError("ROLE_NOT_FOUND", "Role was not found.", status_code=404)
    if role.scope == "platform" and not can_assign_role(principal.roles, role.key):
        raise ApiError("PRIVILEGE_ESCALATION_DENIED", "A lower role cannot assign this platform role.", status_code=403)
        
    await log_audit_event(
        session,
        action="user.role.assign",
        resource_type="role_assignment",
        resource_id=f"{user_id}:{role_id}",
        result="success",
        principal=principal,
        after_summary={"user_id": str(user_id), "role_id": str(role_id), "role_key": role.key},
        request=request
    )
    await session.commit()
    return {"user_id": user_id, "role_id": role_id, "status": "accepted"}


@router.get("/invitations", dependencies=[Depends(require_permission("invitations.view"))])
async def list_invitations(session: AsyncSession = Depends(get_session)) -> list[InvitationOut]:
    return (await session.scalars(select(Invitation).order_by(Invitation.created_at.desc()).limit(100))).all()


@router.post("/invitations", dependencies=[Depends(require_permission("invitations.create"))])
async def create_invitation(
    payload: InvitationCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    principal: CurrentPrincipal = Depends(current_principal),
):
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

    await log_audit_event(
        session,
        action="invitation.create",
        resource_type="invitation",
        resource_id=str(invitation.id),
        result="success",
        principal=principal,
        application_id=payload.application_id,
        after_summary={"email": invitation.email, "role_id": str(payload.role_id)},
        request=request
    )
    await session.commit()
    return {"id": invitation.id, "status": invitation.status, "acceptance_token": token}


@router.get("/audit-events", dependencies=[Depends(require_permission("audit.view"))])
async def list_audit_events(session: AsyncSession = Depends(get_session)):
    total = await session.scalar(select(func.count()).select_from(AuditEvent))
    items = (await session.scalars(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(100))).all()
    return {"items": items, "total": total}
