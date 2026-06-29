from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from iitd_iam.auth.dependencies import current_principal, require_permission, get_keycloak_client
from iitd_iam.auth.identity import CurrentPrincipal
from iitd_iam.auth.permissions import can_assign_role, has_permission, ROLE_PERMISSIONS
from iitd_iam.auth.redirects import RedirectValidationError, validate_redirect_uri
from iitd_iam.config import get_settings
from iitd_iam.database import get_session
from iitd_iam.errors import ApiError
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
    ApplicationStatus,
    AssignmentSource,
    AuditEvent,
    GrantStatus,
    Invitation,
    InvitationStatus,
    Permission,
    RedirectUri,
    Role,
    RoleScope,
    User,
    UserRoleAssignment,
    UserStatus,
    ClientType,
)
from iitd_iam.schemas import (
    ApplicationCreate,
    ApplicationOut,
    ApplicationUpdate,
    EnvironmentCreate,
    EnvironmentOut,
    GrantCreate,
    InvitationAcceptOut,
    InvitationAcceptRequest,
    InvitationCreate,
    InvitationOut,
    PermissionOut,
    RedirectUriCreate,
    RoleAssignmentCreate,
    RoleAssignmentOut,
    RoleCreate,
    RoleOut,
    UserCreate,
    UserOut,
)
from iitd_iam.observability.audit import log_audit_event

router = APIRouter()


def _normalize_email(email: str) -> str:
    """Consistent email normalization used at invitation creation and acceptance."""
    return email.strip().lower()


def _is_super_admin(principal: CurrentPrincipal) -> bool:
    return "super_admin" in principal.roles or "*" in principal.permissions


def _has_scoped_permission(principal: CurrentPrincipal, permission: str) -> bool:
    """Check whether the principal holds a permission via any of their roles."""
    return has_permission(principal.roles, permission)


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------

@router.get("/me")
async def me(principal: CurrentPrincipal = Depends(current_principal)):
    return {
        "subject": principal.subject,
        "issuer": principal.issuer,
        "email": principal.email,
        "roles": list(principal.roles),
    }


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

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
    normalized = _normalize_email(payload.email)
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


# ---------------------------------------------------------------------------
# User Role Assignments
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/role-assignments", response_model=list[RoleAssignmentOut], dependencies=[Depends(require_permission("roles.view"))])
async def list_role_assignments(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> list[RoleAssignmentOut]:
    user = await session.get(User, user_id)
    if not user:
        raise ApiError("USER_NOT_FOUND", "User was not found.", status_code=404)
    assignments = (await session.scalars(
        select(UserRoleAssignment)
        .where(UserRoleAssignment.user_id == user_id)
        .where(UserRoleAssignment.status == GrantStatus.active)
    )).all()
    return assignments


@router.post("/users/{user_id}/role-assignments", response_model=RoleAssignmentOut, dependencies=[Depends(require_permission("roles.assign"))])
async def assign_role(
    user_id: UUID,
    payload: RoleAssignmentCreate,
    request: Request,
    principal: CurrentPrincipal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    user = await session.get(User, user_id)
    if not user:
        raise ApiError("USER_NOT_FOUND", "User was not found.", status_code=404)

    role = await session.get(Role, payload.role_id)
    if not role:
        raise ApiError("ROLE_NOT_FOUND", "Role was not found.", status_code=404)

    # Platform role: only principals with sufficient rank can assign
    if role.scope == RoleScope.platform and not can_assign_role(principal.roles, role.key):
        raise ApiError("PRIVILEGE_ESCALATION_DENIED", "A lower role cannot assign this platform role.", status_code=403)

    # Scoped role: require roles.create permission for that application
    if role.scope == RoleScope.application:
        if not _is_super_admin(principal) and not _has_scoped_permission(principal, "roles.create"):
            raise ApiError("PERMISSION_DENIED", "You lack roles.create for this application.", status_code=403)

    # Check for existing active assignment (idempotency for manual path → 409)
    existing = await session.scalar(
        select(UserRoleAssignment)
        .where(UserRoleAssignment.user_id == user_id)
        .where(UserRoleAssignment.role_id == payload.role_id)
        .where(UserRoleAssignment.application_id == role.application_id)
        .where(UserRoleAssignment.status == GrantStatus.active)
    )
    if existing:
        raise ApiError("ROLE_ALREADY_ASSIGNED", "This role is already assigned to the user.", status_code=409)

    assignment = UserRoleAssignment(
        user_id=user_id,
        role_id=payload.role_id,
        application_id=role.application_id,
        status=GrantStatus.active,
        source=AssignmentSource.manual,
        assigned_by_user_id=principal.user_id,
    )
    session.add(assignment)
    await session.flush()

    await log_audit_event(
        session,
        action="user.role.assign",
        resource_type="role_assignment",
        resource_id=str(assignment.id),
        result="success",
        principal=principal,
        after_summary={"user_id": str(user_id), "role_id": str(payload.role_id), "role_key": role.key, "source": "manual"},
        request=request,
    )
    await session.commit()
    await session.refresh(assignment)
    return assignment


@router.delete("/users/{user_id}/role-assignments/{assignment_id}", dependencies=[Depends(require_permission("roles.assign"))])
async def revoke_role_assignment(
    user_id: UUID,
    assignment_id: UUID,
    request: Request,
    principal: CurrentPrincipal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    assignment = await session.get(UserRoleAssignment, assignment_id)
    if not assignment or assignment.user_id != user_id:
        raise ApiError("ASSIGNMENT_NOT_FOUND", "Role assignment was not found.", status_code=404)

    assignment.status = GrantStatus.revoked
    await log_audit_event(
        session,
        action="user.role.revoke",
        resource_type="role_assignment",
        resource_id=str(assignment_id),
        result="success",
        principal=principal,
        request=request,
    )
    await session.commit()
    return {"status": "revoked"}


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

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


@router.patch("/applications/{application_id}", response_model=ApplicationOut, dependencies=[Depends(require_permission("applications.update"))])
async def update_application(
    application_id: UUID,
    payload: ApplicationUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    principal: CurrentPrincipal = Depends(current_principal),
):
    app = await session.get(Application, application_id)
    if not app:
        raise ApiError("APPLICATION_NOT_FOUND", "Application was not found.", status_code=404)

    before = {"name": app.name, "status": app.status.value}

    # Soft lifecycle — validate allowed transitions
    if payload.status is not None and payload.status != app.status:
        if app.status == ApplicationStatus.archived:
            raise ApiError("APPLICATION_ARCHIVED", "Archived applications cannot be modified.", status_code=422)
        if payload.status == ApplicationStatus.archived:
            # Only allow archiving when no active grants exist
            active_grants = await session.scalar(
                select(func.count()).select_from(ApplicationAccessGrant)
                .where(ApplicationAccessGrant.application_id == application_id)
                .where(ApplicationAccessGrant.status == GrantStatus.active)
            )
            if active_grants and active_grants > 0:
                raise ApiError("APPLICATION_HAS_ACTIVE_GRANTS", "Cannot archive an application with active access grants.", status_code=409)
        app.status = payload.status

    if payload.name is not None:
        app.name = payload.name
    if payload.description is not None:
        app.description = payload.description

    await log_audit_event(
        session,
        action="application.update",
        resource_type="application",
        resource_id=str(app.id),
        result="success",
        principal=principal,
        application_id=app.id,
        before_summary=before,
        after_summary={"name": app.name, "status": app.status.value},
        request=request,
    )
    await session.commit()
    await session.refresh(app)
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

    if app.status == ApplicationStatus.archived:
        raise ApiError("APPLICATION_ARCHIVED", "Cannot add environments to an archived application.", status_code=422)

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
    app = await session.get(Application, application_id)
    if not app:
        raise ApiError("APPLICATION_NOT_FOUND", "Application was not found.", status_code=404)
    if app.status == ApplicationStatus.archived:
        raise ApiError("APPLICATION_ARCHIVED", "Cannot grant access to an archived application.", status_code=422)

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


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------

@router.get("/roles", response_model=list[RoleOut], dependencies=[Depends(require_permission("roles.view"))])
async def list_roles(
    session: AsyncSession = Depends(get_session),
    principal: CurrentPrincipal = Depends(current_principal),
) -> list[RoleOut]:
    """
    Super-admins see all roles.
    Application admins see platform roles + roles for their managed applications.
    Others: 403 via require_permission guard above.
    """
    if _is_super_admin(principal):
        return (await session.scalars(select(Role).order_by(Role.created_at.desc()).limit(200))).all()

    # Return platform-scoped roles + application roles for applications this principal manages
    managed_app_ids_result = await session.scalars(
        select(ApplicationAccessGrant.application_id)
        .where(ApplicationAccessGrant.user_id == principal.user_id)
        .where(ApplicationAccessGrant.status == GrantStatus.active)
    )
    managed_app_ids = list(managed_app_ids_result.all())

    roles = (await session.scalars(
        select(Role).where(
            (Role.scope == RoleScope.platform) |
            (Role.application_id.in_(managed_app_ids))
        ).order_by(Role.created_at.desc()).limit(200)
    )).all()
    return roles


@router.get("/applications/{application_id}/roles", response_model=list[RoleOut], dependencies=[Depends(require_permission("roles.view"))])
async def list_application_roles(
    application_id: UUID,
    session: AsyncSession = Depends(get_session),
    principal: CurrentPrincipal = Depends(current_principal),
) -> list[RoleOut]:
    app = await session.get(Application, application_id)
    if not app:
        raise ApiError("APPLICATION_NOT_FOUND", "Application was not found.", status_code=404)

    if not _is_super_admin(principal):
        # Verify the principal has an active grant for this application
        grant = await session.scalar(
            select(ApplicationAccessGrant)
            .where(ApplicationAccessGrant.application_id == application_id)
            .where(ApplicationAccessGrant.user_id == principal.user_id)
            .where(ApplicationAccessGrant.status == GrantStatus.active)
        )
        if not grant:
            raise ApiError("PERMISSION_DENIED", "You do not manage this application.", status_code=403)

    return (await session.scalars(
        select(Role)
        .where(Role.application_id == application_id)
        .order_by(Role.created_at.desc())
    )).all()


@router.post("/applications/{application_id}/roles", response_model=RoleOut, dependencies=[Depends(require_permission("roles.create"))])
async def create_application_role(
    application_id: UUID,
    payload: RoleCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    principal: CurrentPrincipal = Depends(current_principal),
):
    app = await session.get(Application, application_id)
    if not app:
        raise ApiError("APPLICATION_NOT_FOUND", "Application was not found.", status_code=404)
    if app.status == ApplicationStatus.archived:
        raise ApiError("APPLICATION_ARCHIVED", "Cannot create roles for an archived application.", status_code=422)

    # Scoped authorization: must have roles.create via a scoped role for this application,
    # or be a super-admin / platform-admin
    if not _is_super_admin(principal):
        grant = await session.scalar(
            select(ApplicationAccessGrant)
            .where(ApplicationAccessGrant.application_id == application_id)
            .where(ApplicationAccessGrant.user_id == principal.user_id)
            .where(ApplicationAccessGrant.status == GrantStatus.active)
        )
        if not grant:
            raise ApiError("PERMISSION_DENIED", "You do not manage this application.", status_code=403)

    existing = await session.scalar(
        select(Role)
        .where(Role.application_id == application_id)
        .where(Role.key == payload.key)
    )
    if existing:
        raise ApiError("ROLE_ALREADY_EXISTS", "A role with this key already exists for this application.", status_code=400)

    role = Role(
        key=payload.key,
        name=payload.name,
        description=payload.description,
        application_id=application_id,
        scope=RoleScope.application,
        is_system=False,
    )
    session.add(role)
    await session.commit()
    await session.refresh(role)

    await log_audit_event(
        session,
        action="role.create",
        resource_type="role",
        resource_id=str(role.id),
        result="success",
        principal=principal,
        application_id=application_id,
        after_summary={"key": role.key, "name": role.name},
        request=request,
    )
    await session.commit()
    return role


# ---------------------------------------------------------------------------
# Permissions (platform-defined, read-only in V1)
# ---------------------------------------------------------------------------

@router.get("/permissions", response_model=list[PermissionOut], dependencies=[Depends(require_permission("permissions.view"))])
async def list_permissions(session: AsyncSession = Depends(get_session)) -> list[PermissionOut]:
    return (await session.scalars(select(Permission).order_by(Permission.created_at.desc()).limit(500))).all()


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------

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
    # Block invitation for suspended or archived applications
    if payload.application_id:
        app = await session.get(Application, payload.application_id)
        if not app:
            raise ApiError("APPLICATION_NOT_FOUND", "Application was not found.", status_code=404)
        if app.status == ApplicationStatus.suspended:
            raise ApiError("APPLICATION_SUSPENDED", "Cannot invite users to a suspended application.", status_code=409)
        if app.status == ApplicationStatus.archived:
            raise ApiError("APPLICATION_ARCHIVED", "Cannot invite users to an archived application.", status_code=410)

    token = token_urlsafe(32)
    invitation = Invitation(
        email=payload.email,
        normalized_email=_normalize_email(payload.email),
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
        # Raw token deliberately excluded from audit summary
        after_summary={"email": invitation.email, "role_id": str(payload.role_id) if payload.role_id else None},
        request=request
    )
    await session.commit()
    return {"id": invitation.id, "status": invitation.status, "acceptance_token": token}


@router.post("/invitations/accept", response_model=InvitationAcceptOut)
async def accept_invitation(
    payload: InvitationAcceptRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
    # Bearer token required — proves the invitee is authenticated via Keycloak
    principal: CurrentPrincipal = Depends(current_principal),
):
    """
    Accept an invitation using the raw token submitted in the request body.
    The caller must be authenticated (Bearer token). The authenticated user's
    normalized email must match the invited email.

    No Keycloak admin calls are made here. The authenticated principal already
    proves a Keycloak identity exists.
    """
    now = datetime.now(UTC)
    token_hash = sha256(payload.token.encode()).hexdigest()

    # --- Pre-transaction validations (no DB writes) ---

    invitation = await session.scalar(
        select(Invitation).where(Invitation.token_hash == token_hash)
    )
    if not invitation:
        raise ApiError("INVITATION_NOT_FOUND", "Invitation not found.", status_code=404)

    if invitation.status == InvitationStatus.accepted:
        raise ApiError("INVITATION_ALREADY_ACCEPTED", "This invitation has already been accepted.", status_code=409)

    if invitation.status == InvitationStatus.revoked:
        raise ApiError("INVITATION_REVOKED", "This invitation has been revoked.", status_code=410)

    # Derived expired state — never stored as a status value
    if invitation.status == InvitationStatus.pending and invitation.expires_at.replace(tzinfo=UTC) <= now:
        raise ApiError("INVITATION_EXPIRED", "This invitation has expired.", status_code=410)

    # Validate application state before touching anything
    app: Application | None = None
    if invitation.application_id:
        app = await session.get(Application, invitation.application_id)
        if app and app.status == ApplicationStatus.suspended:
            raise ApiError("APPLICATION_SUSPENDED", "The target application is suspended.", status_code=409)
        if app and app.status == ApplicationStatus.archived:
            raise ApiError("APPLICATION_ARCHIVED", "The target application is archived.", status_code=410)

    # Authenticate: email must match
    if not principal.email:
        raise ApiError("EMAIL_CLAIM_MISSING", "Authenticated token is missing the email claim.", status_code=422)

    settings = get_settings()
    if getattr(settings, "require_email_verified", False) and not getattr(principal, "email_verified", False):
        raise ApiError("EMAIL_NOT_VERIFIED", "Your email address must be verified to accept an invitation.", status_code=403)

    if _normalize_email(principal.email) != invitation.normalized_email:
        raise ApiError("EMAIL_MISMATCH", "Authenticated user email does not match the invited email.", status_code=403)

    # Validate role scope
    role: Role | None = None
    if invitation.role_id:
        role = await session.get(Role, invitation.role_id)
        if not role:
            raise ApiError("ROLE_NOT_FOUND", "Invited role no longer exists.", status_code=404)
        if role.scope == RoleScope.platform:
            raise ApiError("PLATFORM_ROLE_VIA_INVITATION", "Platform roles cannot be assigned through invitations.", status_code=422)
        if not invitation.application_id:
            raise ApiError("ROLE_WITHOUT_APPLICATION", "Cannot assign an application-scoped role without an application context.", status_code=422)
        if role.application_id != invitation.application_id:
            raise ApiError("ROLE_APPLICATION_MISMATCH", "The role does not belong to the invited application.", status_code=422)

    # --- Atomic transaction using savepoint ---
    try:
        async with session.begin_nested():
            # Atomic acceptance guard: UPDATE only if still pending and not expired
            result = await session.execute(
                update(Invitation)
                .where(Invitation.id == invitation.id)
                .where(Invitation.status == InvitationStatus.pending)
                .where(Invitation.expires_at > now)
                .values(
                    status=InvitationStatus.accepted,
                    accepted_at=now,
                )
                .execution_options(synchronize_session="fetch")
            )
            if result.rowcount == 0:
                raise ApiError("INVITATION_ALREADY_ACCEPTED", "Invitation was accepted or expired concurrently.", status_code=409)

            # Upsert local IAM user from authenticated Keycloak principal
            issuer_url = str(settings.oidc_issuer)
            user = await session.scalar(
                select(User).where(
                    (User.keycloak_user_id == principal.subject) |
                    (User.identity_subject == principal.subject)
                )
            )
            if not user:
                # Create local IAM record — Keycloak identity already exists (authenticated)
                user = User(
                    identity_issuer=issuer_url,
                    identity_subject=principal.subject,
                    keycloak_user_id=principal.subject,
                    email=principal.email,
                    normalized_email=_normalize_email(principal.email),
                    display_name=getattr(principal, "display_name", None),
                    status=UserStatus.active,
                )
                session.add(user)
                await session.flush()  # get user.id

            # Update accepted_by_user_id now that we have user.id
            await session.execute(
                update(Invitation)
                .where(Invitation.id == invitation.id)
                .values(accepted_by_user_id=user.id)
            )

            # Upsert ApplicationAccessGrant
            grant_record: ApplicationAccessGrant | None = None
            if invitation.application_id:
                grant_record = await session.scalar(
                    select(ApplicationAccessGrant)
                    .where(ApplicationAccessGrant.application_id == invitation.application_id)
                    .where(ApplicationAccessGrant.user_id == user.id)
                )
                if not grant_record:
                    grant_record = ApplicationAccessGrant(
                        application_id=invitation.application_id,
                        user_id=user.id,
                        status=GrantStatus.active,
                        granted_at=now,
                    )
                    session.add(grant_record)
                    await session.flush()

            # Upsert UserRoleAssignment
            assignment_record: UserRoleAssignment | None = None
            if role:
                assignment_record = await session.scalar(
                    select(UserRoleAssignment)
                    .where(UserRoleAssignment.user_id == user.id)
                    .where(UserRoleAssignment.role_id == role.id)
                    .where(UserRoleAssignment.application_id == role.application_id)
                )
                if not assignment_record:
                    assignment_record = UserRoleAssignment(
                        user_id=user.id,
                        role_id=role.id,
                        application_id=role.application_id,
                        status=GrantStatus.active,
                        source=AssignmentSource.invitation,
                        assigned_by_user_id=None,
                    )
                    session.add(assignment_record)
                    await session.flush()

            # Audit log — no raw token in summary
            await log_audit_event(
                session,
                action="invitation.accept",
                resource_type="invitation",
                resource_id=str(invitation.id),
                result="success",
                principal=principal,
                application_id=invitation.application_id,
                after_summary={
                    "user_id": str(user.id),
                    "email": user.email,
                    "role_id": str(role.id) if role else None,
                    "role_key": role.key if role else None,
                },
                request=request,
            )
            # Savepoint commits on context exit

        await session.commit()

        return InvitationAcceptOut(
            invitation_id=invitation.id,
            status="accepted",
            accepted_at=now,
            user={"id": user.id, "email": user.email},
            application={"id": app.id, "name": app.name} if app else None,
            role_assignment=(
                {
                    "id": assignment_record.id,
                    "role_id": role.id,
                    "role_name": role.name,
                    "source": AssignmentSource.invitation,
                }
                if assignment_record and role
                else None
            ),
        )

    except ApiError:
        await session.rollback()
        raise
    except Exception as exc:
        await session.rollback()
        raise ApiError("ACCEPTANCE_FAILED", "Invitation acceptance failed due to an internal error.", status_code=500) from exc


# ---------------------------------------------------------------------------
# Audit Events
# ---------------------------------------------------------------------------

@router.get("/audit-events", dependencies=[Depends(require_permission("audit.view"))])
async def list_audit_events(session: AsyncSession = Depends(get_session)):
    total = await session.scalar(select(func.count()).select_from(AuditEvent))
    items = (await session.scalars(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(100))).all()
    return {"items": items, "total": total}
