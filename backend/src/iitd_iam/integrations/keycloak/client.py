import httpx

from iitd_iam.config import Settings
from iitd_iam.integrations.keycloak.errors import KeycloakError


class KeycloakHttpClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = httpx.AsyncClient(base_url=str(settings.keycloak_base_url), timeout=10.0)

    async def get_json(self, path: str, token: str | None = None) -> dict:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        response = await self._client.get(path, headers=headers)
        if response.status_code >= 400:
            raise KeycloakError("KEYCLOAK_REQUEST_FAILED", response.status_code)
        return response.json()

