from typing import Annotated

from fastapi import Depends, Header

from iitd_iam.auth.identity import CurrentPrincipal
from iitd_iam.auth.permissions import has_permission
from iitd_iam.config import get_settings
from iitd_iam.errors import ApiError
from iitd_iam.integrations.keycloak.token_verifier import (
    TokenVerifier,
    extract_roles_and_permissions,
    normalize_jwt_error,
)


async def current_principal(
    authorization: Annotated[str | None, Header()] = None,
    x_dev_user: Annotated[str | None, Header()] = None,
    x_dev_roles: Annotated[str | None, Header()] = None,
) -> CurrentPrincipal:
    settings = get_settings()
    if settings.allow_dev_auth and x_dev_user:
        roles = {role.strip() for role in (x_dev_roles or "user").split(",") if role.strip()}
        return CurrentPrincipal(subject=x_dev_user, issuer="dev", email=x_dev_user, roles=roles)
    if not authorization:
        raise ApiError("AUTHENTICATION_REQUIRED", "Authentication is required.", status_code=401)
    if not authorization.startswith("Bearer "):
        raise ApiError("TOKEN_INVALID", "Bearer token is required.", status_code=401)
    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = await TokenVerifier(settings).verify(token)
    except Exception as exc:
        normalized = normalize_jwt_error(exc)
        raise ApiError("TOKEN_INVALID", "The access token could not be verified.", status_code=401, details=[str(normalized)]) from exc

    roles, permissions = extract_roles_and_permissions(claims, resource_client_id="iitd-iam-admin")
    return CurrentPrincipal(
        subject=claims["sub"],
        issuer=claims["iss"],
        email=claims.get("email"),
        roles=roles,
        permissions=permissions,
    )


def require_permission(permission: str):
    async def dependency(principal: CurrentPrincipal = Depends(current_principal)) -> CurrentPrincipal:
        if permission in principal.permissions or has_permission(principal.roles, permission):
            return principal
        raise ApiError("PERMISSION_DENIED", "The principal lacks the required permission.", status_code=403)

    return dependency


from collections.abc import AsyncGenerator
from iitd_iam.integrations.keycloak.client import KeycloakHttpClient

async def get_keycloak_client() -> AsyncGenerator[KeycloakHttpClient, None]:
    settings = get_settings()
    client = KeycloakHttpClient(settings)
    try:
        yield client
    finally:
        await client.close()
