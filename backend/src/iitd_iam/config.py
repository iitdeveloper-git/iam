from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, PostgresDsn, RedisDsn, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PLACEHOLDER_MARKERS = ("replace", "change", "changeme", "example", "password", "secret", "default")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="IAM_", extra="ignore")

    service_name: str = "iitd-iam-api"
    environment: Literal["local", "test", "staging", "production"] = "local"
    api_base_path: str = "/api/v1"
    database_url: PostgresDsn = Field(..., description="PostgreSQL DSN; SQLite is not supported")
    database_pool_size: int = 3
    database_max_overflow: int = 0
    database_pool_recycle_seconds: int = 300
    redis_url: RedisDsn = "redis://redis:6379/0"
    keycloak_base_url: AnyHttpUrl = "http://keycloak:8080"
    keycloak_realm: str = "iitd"
    keycloak_admin_client_id: str = "iitd-iam-admin"
    keycloak_admin_client_secret: str | None = None
    keycloak_admin_password: str | None = None
    oidc_issuer: AnyHttpUrl = "http://keycloak:8080/realms/iitd"
    oidc_jwks_url: AnyHttpUrl | None = None
    oidc_audience: str = "iitd-iam-api"
    oidc_algorithms: list[str] = ["RS256"]
    oidc_allowed_authorized_parties: list[str] = ["iitd-iam-admin"]
    cors_origins: list[str] = ["http://localhost:3030"]
    allowed_redirect_urls: list[AnyHttpUrl] = []
    cookie_secure: bool = False
    debug: bool = False
    allow_dev_auth: bool = False
    allow_uat_bearer_token_fallback: bool = False

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

    @model_validator(mode="after")
    def validate_production_safety(self):
        if self.environment != "production":
            return self

        if self.allow_dev_auth:
            raise ValueError("production cannot enable development authentication")
        if self.allow_uat_bearer_token_fallback:
            raise ValueError("production cannot enable the UAT bearer-token fallback")
        if self.debug:
            raise ValueError("production cannot enable debug mode")
        if not self.cookie_secure:
            raise ValueError("production cookies must be secure")
        if self.oidc_jwks_url is None:
            raise ValueError("production requires IAM_OIDC_JWKS_URL")
        if str(self.oidc_issuer).startswith("http://"):
            raise ValueError("production OIDC issuer must use HTTPS")
        if str(self.oidc_jwks_url).startswith("http://"):
            raise ValueError("production JWKS URL must use HTTPS")
        if "*" in self.cors_origins:
            raise ValueError("production CORS cannot allow wildcard origins")
        for origin in self.cors_origins:
            if not origin.startswith("https://"):
                raise ValueError("production CORS origins must use HTTPS")
        for redirect_url in self.allowed_redirect_urls:
            if str(redirect_url).startswith("http://"):
                raise ValueError("production redirect URLs must use HTTPS")
        for name, value in {
            "keycloak_admin_client_secret": self.keycloak_admin_client_secret,
            "keycloak_admin_password": self.keycloak_admin_password,
        }.items():
            if value is None:
                continue
            lowered = value.lower()
            if any(marker in lowered for marker in PLACEHOLDER_MARKERS):
                raise ValueError(f"production {name} appears to contain a placeholder")
        if "HS256" in self.oidc_algorithms or "none" in {algorithm.lower() for algorithm in self.oidc_algorithms}:
            raise ValueError("production OIDC algorithms must not include symmetric or none algorithms")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
