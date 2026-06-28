from datetime import UTC, datetime, timedelta

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwt
from pydantic import PostgresDsn

from iitd_iam.config import Settings
from iitd_iam.integrations.keycloak.token_verifier import TokenVerifier


@pytest.fixture(scope="module")
def keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


@pytest.fixture()
def settings():
    return Settings(
        database_url=PostgresDsn("postgresql://iam:iam@localhost:5432/iam"),
        oidc_issuer="https://auth.example.com/realms/iitd",
        oidc_audience="gns",
        environment="test",
    )


def make_token(private_pem: bytes, **overrides):
    now = datetime.now(UTC)
    claims = {
        "iss": "https://auth.example.com/realms/iitd",
        "sub": "user-123",
        "aud": "gns",
        "azp": "iitd-iam-admin",
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=5)).timestamp()),
        "email": "user@example.com",
    }
    claims.update(overrides)
    return jwt.encode(claims, private_pem, algorithm="RS256")


async def test_verifies_valid_signed_token(settings, keypair):
    private_pem, public_pem = keypair
    token = make_token(private_pem)

    claims = await TokenVerifier(settings, public_pem).verify(token)

    assert claims["sub"] == "user-123"
    assert claims["aud"] == "gns"


async def test_rejects_wrong_issuer(settings, keypair):
    private_pem, public_pem = keypair
    token = make_token(private_pem, iss="https://evil.example.com/realms/iitd")

    with pytest.raises(Exception):
        await TokenVerifier(settings, public_pem).verify(token)


async def test_rejects_wrong_audience(settings, keypair):
    private_pem, public_pem = keypair
    token = make_token(private_pem, aud="other-app")

    with pytest.raises(Exception):
        await TokenVerifier(settings, public_pem).verify(token)


async def test_rejects_expired_token(settings, keypair):
    private_pem, public_pem = keypair
    now = datetime.now(UTC)
    token = make_token(
        private_pem,
        iat=int((now - timedelta(minutes=10)).timestamp()),
        nbf=int((now - timedelta(minutes=10)).timestamp()),
        exp=int((now - timedelta(minutes=1)).timestamp()),
    )

    with pytest.raises(Exception):
        await TokenVerifier(settings, public_pem).verify(token)

