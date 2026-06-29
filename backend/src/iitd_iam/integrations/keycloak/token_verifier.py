import asyncio
import time
from collections.abc import Mapping, Sequence
from typing import Any

import httpx
from jose import JWTError, jwt

from iitd_iam.config import Settings


class TokenVerificationError(Exception):
    """Raised when an access token cannot be securely verified."""


class TokenVerifier:
    def __init__(
        self,
        settings: Settings,
        jwks: Any | None = None,
    ) -> None:
        self.settings = settings
        if isinstance(jwks, Mapping):
            self._jwks = dict(jwks)
        elif jwks is not None:
            self._jwks = jwks
        else:
            self._jwks = {}
        self._jwks_loaded_at = time.monotonic() if jwks else 0.0
        self._jwks_lock = asyncio.Lock()

    @property
    def jwks_url(self) -> str:
        if self.settings.oidc_jwks_url:
            return str(self.settings.oidc_jwks_url)

        issuer = str(self.settings.oidc_issuer).rstrip("/")
        return f"{issuer}/protocol/openid-connect/certs"

    async def _fetch_jwks(self) -> dict[str, Any]:
        timeout = httpx.Timeout(
            connect=3.0,
            read=8.0,
            write=3.0,
            pool=3.0,
        )

        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=False,
        ) as client:
            response = await client.get(
                self.jwks_url,
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()

        payload = response.json()

        if not isinstance(payload, dict):
            raise TokenVerificationError("OIDC JWKS response is invalid")

        keys = payload.get("keys")
        if not isinstance(keys, list) or not keys:
            raise TokenVerificationError("OIDC JWKS contains no signing keys")

        return payload

    async def get_jwks(
        self,
        *,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        ttl_seconds = getattr(
            self.settings,
            "oidc_jwks_cache_ttl_seconds",
            300,
        )
        now = time.monotonic()

        if (
            not force_refresh
            and self._jwks
            and now - self._jwks_loaded_at < ttl_seconds
        ):
            return self._jwks

        async with self._jwks_lock:
            now = time.monotonic()

            if (
                not force_refresh
                and self._jwks
                and now - self._jwks_loaded_at < ttl_seconds
            ):
                return self._jwks

            self._jwks = await self._fetch_jwks()
            self._jwks_loaded_at = now
            return self._jwks

    def _allowed_algorithms(self) -> list[str]:
        configured = self.settings.oidc_algorithms

        if isinstance(configured, str):
            algorithms = [
                value.strip()
                for value in configured.split(",")
                if value.strip()
            ]
        else:
            algorithms = list(configured)

        if not algorithms:
            raise TokenVerificationError(
                "No OIDC signing algorithms are configured"
            )

        if "none" in {algorithm.lower() for algorithm in algorithms}:
            raise TokenVerificationError(
                "The unsecured JWT algorithm is forbidden"
            )

        return algorithms

    def _validate_audience(self, claims: Mapping[str, Any]) -> None:
        expected_audience = str(self.settings.oidc_audience)

        token_audience = claims.get("aud")

        if isinstance(token_audience, str):
            audiences = {token_audience}
        elif isinstance(token_audience, Sequence) and not isinstance(
            token_audience,
            (str, bytes),
        ):
            audiences = {
                str(value)
                for value in token_audience
                if isinstance(value, str)
            }
        else:
            audiences = set()

        if expected_audience not in audiences:
            raise TokenVerificationError(
                "Token was not issued for the IITD IAM API"
            )

    def _validate_authorized_party(
        self,
        claims: Mapping[str, Any],
    ) -> None:
        allowed_parties = set(
            getattr(
                self.settings,
                "oidc_allowed_authorized_parties",
                [],
            )
            or []
        )

        if not allowed_parties:
            return

        authorized_party = claims.get("azp")

        if (
            not isinstance(authorized_party, str)
            or authorized_party not in allowed_parties
        ):
            raise TokenVerificationError(
                "Token authorized party is not allowed"
            )

    async def verify(self, token: str) -> dict[str, Any]:
        if not token or token.count(".") != 2:
            raise TokenVerificationError("Malformed access token")

        decode_options = {
            "verify_signature": True,
            "verify_exp": True,
            "verify_nbf": True,
            "verify_iat": True,
            "verify_iss": True,
            "verify_aud": True,
            "verify_at_hash": False,
            "require_exp": True,
            "require_iat": True,
            "require_sub": True,
        }

        async def decode_with(
            jwks: Mapping[str, Any],
        ) -> dict[str, Any]:
            return jwt.decode(
                token,
                jwks,
                algorithms=self._allowed_algorithms(),
                audience=str(self.settings.oidc_audience),
                issuer=str(self.settings.oidc_issuer).rstrip("/"),
                options=decode_options,
            )

        try:
            claims = await decode_with(await self.get_jwks())
        except JWTError:
            # Keycloak may have rotated its signing key. Refresh JWKS once.
            try:
                claims = await decode_with(
                    await self.get_jwks(force_refresh=True)
                )
            except JWTError as second_error:
                raise TokenVerificationError(
                    "Access token verification failed"
                ) from second_error
            except (httpx.HTTPError, ValueError, TypeError) as second_error:
                raise TokenVerificationError(
                    "OIDC signing keys are unavailable"
                ) from second_error
        except (httpx.HTTPError, ValueError, TypeError) as first_error:
            raise TokenVerificationError(
                "OIDC signing keys are unavailable"
            ) from first_error

        self._validate_audience(claims)
        self._validate_authorized_party(claims)

        token_type = claims.get("typ")
        if token_type not in {None, "Bearer", "JWT", "at+jwt"}:
            raise TokenVerificationError("Invalid access token type")

        return claims


def extract_roles_and_permissions(
    claims: Mapping[str, Any],
    *,
    resource_client_id: str | None = None,
) -> tuple[set[str], set[str]]:
    roles: set[str] = set()
    permissions: set[str] = set()

    application_roles = claims.get("application_roles")
    if isinstance(application_roles, list):
        roles.update(
            role for role in application_roles if isinstance(role, str)
        )

    token_permissions = claims.get("permissions")
    if isinstance(token_permissions, list):
        permissions.update(
            permission
            for permission in token_permissions
            if isinstance(permission, str)
        )

    realm_access = claims.get("realm_access")
    if isinstance(realm_access, dict):
        realm_roles = realm_access.get("roles")
        if isinstance(realm_roles, list):
            roles.update(
                role for role in realm_roles if isinstance(role, str)
            )

    resource_access = claims.get("resource_access")
    if isinstance(resource_access, dict):
        if resource_client_id:
            selected_access = resource_access.get(resource_client_id)
            accesses = [selected_access]
        else:
            accesses = list(resource_access.values())

        for access in accesses:
            if not isinstance(access, dict):
                continue

            client_roles = access.get("roles")
            if isinstance(client_roles, list):
                roles.update(
                    role
                    for role in client_roles
                    if isinstance(role, str)
                )

    return roles, permissions


def normalize_jwt_error(exc: Exception) -> TokenVerificationError:
    if isinstance(exc, TokenVerificationError):
        return exc
    return TokenVerificationError(str(exc))
