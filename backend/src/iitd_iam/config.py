from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="IAM_", extra="ignore")

    service_name: str = "iitd-iam-api"
    environment: Literal["local", "test", "staging", "production"] = "local"
    api_base_path: str = "/api/v1"
    database_url: PostgresDsn = Field(..., description="PostgreSQL DSN; SQLite is not supported")
    redis_url: RedisDsn = "redis://redis:6379/0"
    keycloak_base_url: AnyHttpUrl = "http://keycloak:8080"
    keycloak_realm: str = "iitd"
    keycloak_admin_client_id: str = "iitd-iam-admin"
    keycloak_admin_client_secret: str | None = None
    oidc_issuer: AnyHttpUrl = "http://keycloak:8080/realms/iitd"
    oidc_audience: str = "iitd-iam-admin"
    oidc_algorithms: list[str] = ["RS256"]
    cors_origins: list[str] = ["http://localhost:3030"]
    allow_dev_auth: bool = False

    @field_validator("database_url")
    @classmethod
    def reject_sqlite(cls, value: PostgresDsn) -> PostgresDsn:
        if not str(value).startswith(("postgresql://", "postgresql+asyncpg://")):
            raise ValueError("IITD IAM requires PostgreSQL")
        return value

    @field_validator("allow_dev_auth")
    @classmethod
    def reject_prod_dev_auth(cls, value: bool, info):
        if value and info.data.get("environment") == "production":
            raise ValueError("development authentication is forbidden in production")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
