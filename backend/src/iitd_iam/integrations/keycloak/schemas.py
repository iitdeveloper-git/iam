from pydantic import BaseModel, EmailStr, Field


class KeycloakUserCreate(BaseModel):
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    enabled: bool = True
    email_verified: bool = False
    required_actions: list[str] = Field(default_factory=list)


class KeycloakUserUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    enabled: bool | None = None
    email_verified: bool | None = None


class KeycloakClientCreate(BaseModel):
    client_id: str
    name: str
    public_client: bool
    service_accounts_enabled: bool = False
    redirect_uris: list[str] = Field(default_factory=list)
    web_origins: list[str] = Field(default_factory=list)
    standard_flow_enabled: bool = True
    direct_access_grants_enabled: bool = False


class KeycloakClientUpdate(BaseModel):
    name: str | None = None
    enabled: bool | None = None
    redirect_uris: list[str] | None = None
    web_origins: list[str] | None = None

