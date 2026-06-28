import time

import httpx
from jose import JWTError, jwt

from iitd_iam.config import Settings


class TokenVerifier:
    def __init__(self, settings: Settings, jwks: dict | None = None):
        self.settings = settings
        self.jwks = jwks or {}
        self._jwks_loaded_at = 0.0

    async def _fetch_jwks(self) -> dict:
        jwks_url = f"{str(self.settings.oidc_issuer).rstrip('/')}/protocol/openid-connect/certs"
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(jwks_url)
            response.raise_for_status()
            return response.json()

    async def get_jwks(self) -> dict:
        now = time.monotonic()
        if self.jwks and now - self._jwks_loaded_at < 300:
            return self.jwks
        self.jwks = await self._fetch_jwks()
        self._jwks_loaded_at = now
        return self.jwks

    async def verify(self, token: str) -> dict:
        return jwt.decode(
            token,
            await self.get_jwks(),
            algorithms=self.settings.oidc_algorithms,
            audience=self.settings.oidc_audience,
            issuer=str(self.settings.oidc_issuer),
            options={"verify_at_hash": False},
        )


def extract_roles_and_permissions(claims: dict) -> tuple[set[str], set[str]]:
    roles: set[str] = set()
    permissions: set[str] = set()

    roles.update(claims.get("application_roles") or [])
    permissions.update(claims.get("permissions") or [])

    realm_access = claims.get("realm_access") or {}
    roles.update(realm_access.get("roles") or [])

    resource_access = claims.get("resource_access") or {}
    for access in resource_access.values():
        if isinstance(access, dict):
            roles.update(access.get("roles") or [])

    return roles or {"user"}, permissions


class TokenVerificationError(Exception):
    pass


def normalize_jwt_error(exc: Exception) -> TokenVerificationError:
    if isinstance(exc, JWTError):
        return TokenVerificationError(str(exc))
    return TokenVerificationError("token verification failed")
