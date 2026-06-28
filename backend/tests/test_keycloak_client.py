import httpx
import pytest
from pydantic import PostgresDsn

from iitd_iam.config import Settings
from iitd_iam.integrations.keycloak.client import KeycloakHttpClient
from iitd_iam.integrations.keycloak.errors import KeycloakRequestError
from iitd_iam.integrations.keycloak.schemas import KeycloakClientCreate, KeycloakUserCreate


def settings():
    return Settings(
        database_url=PostgresDsn("postgresql://iam:iam@localhost:5432/iam"),
        keycloak_base_url="https://auth.example.com",
        keycloak_admin_client_secret="real-admin-secret-value",
        environment="test",
    )


@pytest.mark.asyncio
async def test_create_user_uses_admin_token_and_returns_location_id():
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path.endswith("/protocol/openid-connect/token"):
            return httpx.Response(200, json={"access_token": "admin-token", "expires_in": 300})
        if request.url.path.endswith("/admin/realms/iitd/users"):
            assert request.headers["authorization"] == "Bearer admin-token"
            return httpx.Response(201, headers={"location": "https://auth.example.com/admin/realms/iitd/users/user-123"})
        return httpx.Response(404)

    client = KeycloakHttpClient(settings(), httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url="https://auth.example.com"))

    user_id = await client.create_user(KeycloakUserCreate(email="user@example.com"))

    assert user_id == "user-123"
    assert len(requests) == 2


@pytest.mark.asyncio
async def test_create_client_returns_location_id():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/protocol/openid-connect/token"):
            return httpx.Response(200, json={"access_token": "admin-token", "expires_in": 300})
        if request.url.path.endswith("/admin/realms/iitd/clients"):
            return httpx.Response(201, headers={"location": "https://auth.example.com/admin/realms/iitd/clients/client-123"})
        return httpx.Response(404)

    client = KeycloakHttpClient(settings(), httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url="https://auth.example.com"))

    client_id = await client.create_client(
        KeycloakClientCreate(
            client_id="gns-web",
            name="GNS Web",
            public_client=True,
            redirect_uris=["https://gns.example.com/callback"],
        )
    )

    assert client_id == "client-123"


@pytest.mark.asyncio
async def test_normalizes_admin_errors_without_raw_body():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/protocol/openid-connect/token"):
            return httpx.Response(200, json={"access_token": "admin-token", "expires_in": 300})
        return httpx.Response(500, json={"error": "raw-keycloak-secret-detail"})

    client = KeycloakHttpClient(settings(), httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url="https://auth.example.com"))

    with pytest.raises(KeycloakRequestError) as exc_info:
        await client.fetch_user("user-123")

    assert exc_info.value.code == "KEYCLOAK_ADMIN_REQUEST_FAILED"
    assert "raw-keycloak-secret-detail" not in str(exc_info.value)

