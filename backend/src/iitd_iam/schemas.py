from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from iitd_iam.models import (
    ApplicationStatus,
    AssignmentSource,
    AuthorizationMode,
    ClientType,
    EnvironmentName,
    GrantStatus,
    InvitationStatus,
    RoleScope,
    UserStatus,
)


class Page(BaseModel):
    items: list
    total: int
    limit: int = 50
    offset: int = 0


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    id: UUID
    email: str
    email_verified: bool
    display_name: str | None
    status: UserStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: str
    display_name: str | None = None


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

class ApplicationCreate(BaseModel):
    key: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$")
    name: str
    description: str | None = None
    authorization_mode: AuthorizationMode


class ApplicationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: ApplicationStatus | None = None


class ApplicationOut(ApplicationCreate):
    id: UUID
    status: ApplicationStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Environment / Client
# ---------------------------------------------------------------------------

class EnvironmentCreate(BaseModel):
    environment: EnvironmentName
    issuer_url: HttpUrl
    audience: str
    client_id: str
    client_type: ClientType


class EnvironmentOut(EnvironmentCreate):
    id: UUID
    status: ApplicationStatus

    model_config = {"from_attributes": True}


class RedirectUriCreate(BaseModel):
    redirect_uri: str
    type: str = "login"
    environment: EnvironmentName


# ---------------------------------------------------------------------------
# Invitation
# ---------------------------------------------------------------------------

class InvitationCreate(BaseModel):
    email: str
    application_id: UUID | None = None
    role_id: UUID | None = None


class InvitationOut(BaseModel):
    id: UUID
    email: str
    status: InvitationStatus
    expires_at: datetime

    model_config = {"from_attributes": True}


class InvitationAcceptRequest(BaseModel):
    """Body for POST /invitations/accept — token in body, never in URL."""
    token: str


class _AcceptUserOut(BaseModel):
    id: UUID
    email: str


class _AcceptApplicationOut(BaseModel):
    id: UUID
    name: str


class _AcceptRoleAssignmentOut(BaseModel):
    id: UUID
    role_id: UUID
    role_name: str
    source: AssignmentSource


class InvitationAcceptOut(BaseModel):
    invitation_id: UUID
    status: str
    accepted_at: datetime
    user: _AcceptUserOut
    application: _AcceptApplicationOut | None
    role_assignment: _AcceptRoleAssignmentOut | None


# ---------------------------------------------------------------------------
# Grant
# ---------------------------------------------------------------------------

class GrantCreate(BaseModel):
    user_id: UUID
    status: GrantStatus = GrantStatus.active


# ---------------------------------------------------------------------------
# Role
# ---------------------------------------------------------------------------

class RoleCreate(BaseModel):
    """Creates an application-scoped role. scope is always 'application' via the API."""
    key: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,118}[a-z0-9]$")
    name: str
    description: str | None = None


class RoleOut(BaseModel):
    id: UUID
    key: str
    name: str
    description: str | None
    scope: RoleScope
    application_id: UUID | None
    is_system: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


# ---------------------------------------------------------------------------
# Permission
# ---------------------------------------------------------------------------

class PermissionCreate(BaseModel):
    key: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]*[a-z0-9]$")
    name: str
    description: str | None = None
    resource: str
    action: str


class PermissionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class PermissionOut(BaseModel):
    id: UUID
    key: str
    name: str
    description: str | None
    resource: str
    action: str
    is_active: bool
    application_id: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Role Assignment
# ---------------------------------------------------------------------------

class RoleAssignmentCreate(BaseModel):
    role_id: UUID


class RoleAssignmentOut(BaseModel):
    id: UUID
    user_id: UUID
    role_id: UUID
    application_id: UUID | None
    status: GrantStatus
    source: AssignmentSource
    created_at: datetime

    model_config = {"from_attributes": True}
