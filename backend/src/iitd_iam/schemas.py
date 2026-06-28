from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from iitd_iam.models import ApplicationStatus, AuthorizationMode, ClientType, EnvironmentName, GrantStatus, InvitationStatus, UserStatus


class Page(BaseModel):
    items: list
    total: int
    limit: int = 50
    offset: int = 0


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


class ApplicationCreate(BaseModel):
    key: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$")
    name: str
    description: str | None = None
    authorization_mode: AuthorizationMode


class ApplicationOut(ApplicationCreate):
    id: UUID
    status: ApplicationStatus
    created_at: datetime

    model_config = {"from_attributes": True}


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


class GrantCreate(BaseModel):
    user_id: UUID
    status: GrantStatus = GrantStatus.active

