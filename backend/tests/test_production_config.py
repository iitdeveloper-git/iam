import pytest
from pydantic import ValidationError

from iitd_iam.config import Settings


BASE_PRODUCTION = {
    "environment": "production",
    "database_url": "postgresql://iam:strong-password@db.example.com:5432/iam",
    "redis_url": "redis://redis.example.com:6379/0",
    "keycloak_base_url": "https://auth.example.com",
    "oidc_issuer": "https://auth.example.com/realms/iitd",
    "oidc_jwks_url": "https://auth.example.com/realms/iitd/protocol/openid-connect/certs",
    "oidc_audience": "iitd-iam-admin",
    "cors_origins": ["https://iam.example.com"],
    "allowed_redirect_urls": ["https://iam.example.com/api/auth/callback/iitd-iam"],
    "cookie_secure": True,
    "allow_dev_auth": False,
    "allow_uat_bearer_token_fallback": False,
    "debug": False,
    "keycloak_admin_client_secret": "prod-kc-admin-client-value",
}


def make_settings(**overrides):
    payload = {**BASE_PRODUCTION, **overrides}
    return Settings(**payload)


def test_accepts_secure_production_configuration():
    settings = make_settings()

    assert settings.environment == "production"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("allow_dev_auth", True),
        ("allow_uat_bearer_token_fallback", True),
        ("debug", True),
        ("cookie_secure", False),
        ("oidc_jwks_url", None),
        ("oidc_issuer", "http://auth.example.com/realms/iitd"),
        ("oidc_jwks_url", "http://auth.example.com/realms/iitd/protocol/openid-connect/certs"),
        ("cors_origins", ["*"]),
        ("cors_origins", ["http://iam.example.com"]),
        ("allowed_redirect_urls", ["http://iam.example.com/api/auth/callback/iitd-iam"]),
        ("keycloak_admin_client_secret", "replace-me-secret"),
        ("oidc_algorithms", ["RS256", "HS256"]),
    ],
)
def test_rejects_unsafe_production_configuration(field, value):
    with pytest.raises(ValidationError):
        make_settings(**{field: value})

