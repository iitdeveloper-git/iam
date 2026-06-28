from dataclasses import dataclass
from time import monotonic

import httpx

from iitd_iam.config import Settings
from iitd_iam.integrations.keycloak.errors import KeycloakConfigurationError, KeycloakRequestError
from iitd_iam.integrations.keycloak.schemas import (
    KeycloakClientCreate,
    KeycloakClientUpdate,
    KeycloakUserCreate,
    KeycloakUserUpdate,
)


@dataclass
class AdminToken:
    access_token: str
    expires_at: float

    def usable(self) -> bool:
        return monotonic() < self.expires_at - 30


class KeycloakHttpClient:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self.settings = settings
        self._client = client or httpx.AsyncClient(base_url=str(settings.keycloak_base_url).rstrip("/"), timeout=10.0)
        self._admin_token: AdminToken | None = None

    @property
    def realm(self) -> str:
        return self.settings.keycloak_realm

    async def close(self) -> None:
        await self._client.aclose()

    async def _get_admin_token(self) -> str:
        if self._admin_token and self._admin_token.usable():
            return self._admin_token.access_token
        if not self.settings.keycloak_admin_client_secret:
            raise KeycloakConfigurationError("KEYCLOAK_ADMIN_SECRET_MISSING")
        response = await self._client.post(
            f"/realms/{self.realm}/protocol/openid-connect/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.settings.keycloak_admin_client_id,
                "client_secret": self.settings.keycloak_admin_client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if response.status_code >= 400:
            raise KeycloakRequestError("KEYCLOAK_ADMIN_TOKEN_FAILED", response.status_code)
        payload = response.json()
        self._admin_token = AdminToken(
            access_token=payload["access_token"],
            expires_at=monotonic() + int(payload.get("expires_in", 60)),
        )
        return self._admin_token.access_token

    async def get_json(self, path: str, token: str | None = None) -> dict:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        response = await self._client.get(path, headers=headers)
        if response.status_code >= 400:
            raise KeycloakRequestError("KEYCLOAK_REQUEST_FAILED", response.status_code)
        return response.json()

    async def _admin_request(self, method: str, path: str, *, json: dict | None = None) -> httpx.Response:
        token = await self._get_admin_token()
        response = await self._client.request(
            method,
            f"/admin/realms/{self.realm}{path}",
            headers={"Authorization": f"Bearer {token}"},
            json=json,
        )
        if response.status_code >= 400:
            raise KeycloakRequestError("KEYCLOAK_ADMIN_REQUEST_FAILED", response.status_code)
        return response

    async def create_user(self, payload: KeycloakUserCreate) -> str:
        body = {
            "email": payload.email,
            "firstName": payload.first_name,
            "lastName": payload.last_name,
            "enabled": payload.enabled,
            "emailVerified": payload.email_verified,
            "requiredActions": payload.required_actions,
        }
        response = await self._admin_request("POST", "/users", json={key: value for key, value in body.items() if value is not None})
        location = response.headers.get("location", "")
        return location.rstrip("/").split("/")[-1]

    async def fetch_user(self, user_id: str) -> dict:
        return (await self._admin_request("GET", f"/users/{user_id}")).json()

    async def fetch_users_by_email(self, email: str) -> list[dict]:
        response = await self._admin_request("GET", f"/users?email={email}&exact=true")
        return response.json()

    async def update_user(self, user_id: str, payload: KeycloakUserUpdate) -> None:
        body = {
            "email": payload.email,
            "firstName": payload.first_name,
            "lastName": payload.last_name,
            "enabled": payload.enabled,
            "emailVerified": payload.email_verified,
        }
        await self._admin_request("PUT", f"/users/{user_id}", json={key: value for key, value in body.items() if value is not None})

    async def enable_user(self, user_id: str) -> None:
        await self.update_user(user_id, KeycloakUserUpdate(enabled=True))

    async def disable_user(self, user_id: str) -> None:
        await self.update_user(user_id, KeycloakUserUpdate(enabled=False))

    async def send_verification_email(self, user_id: str) -> None:
        await self._admin_request("PUT", f"/users/{user_id}/send-verify-email")

    async def send_required_actions(self, user_id: str, actions: list[str]) -> None:
        await self._admin_request("PUT", f"/users/{user_id}/execute-actions-email", json=actions)

    async def list_user_sessions(self, user_id: str) -> list[dict]:
        return (await self._admin_request("GET", f"/users/{user_id}/sessions")).json()

    async def revoke_user_sessions(self, user_id: str) -> None:
        await self._admin_request("POST", f"/users/{user_id}/logout")

    async def create_client(self, payload: KeycloakClientCreate) -> str:
        body = {
            "clientId": payload.client_id,
            "name": payload.name,
            "enabled": True,
            "publicClient": payload.public_client,
            "serviceAccountsEnabled": payload.service_accounts_enabled,
            "standardFlowEnabled": payload.standard_flow_enabled,
            "directAccessGrantsEnabled": payload.direct_access_grants_enabled,
            "redirectUris": payload.redirect_uris,
            "webOrigins": payload.web_origins,
        }
        response = await self._admin_request("POST", "/clients", json=body)
        location = response.headers.get("location", "")
        return location.rstrip("/").split("/")[-1]

    async def fetch_client(self, client_uuid: str) -> dict:
        return (await self._admin_request("GET", f"/clients/{client_uuid}")).json()

    async def update_client(self, client_uuid: str, payload: KeycloakClientUpdate) -> None:
        body = {
            "name": payload.name,
            "enabled": payload.enabled,
            "redirectUris": payload.redirect_uris,
            "webOrigins": payload.web_origins,
        }
        await self._admin_request("PUT", f"/clients/{client_uuid}", json={key: value for key, value in body.items() if value is not None})

    async def disable_client(self, client_uuid: str) -> None:
        await self.update_client(client_uuid, KeycloakClientUpdate(enabled=False))

    async def delete_client(self, client_uuid: str) -> None:
        await self._admin_request("DELETE", f"/clients/{client_uuid}")

    async def rotate_client_secret(self, client_uuid: str) -> str:
        return (await self._admin_request("POST", f"/clients/{client_uuid}/client-secret")).json()["value"]
