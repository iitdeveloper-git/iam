from typing import Annotated

from fastapi import Depends, Header

from iitd_iam.auth.identity import CurrentPrincipal
from iitd_iam.auth.permissions import has_permission
from iitd_iam.config import get_settings
from iitd_iam.errors import ApiError


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
    raise ApiError("TOKEN_INVALID", "OIDC token verification is not configured for this local run.", status_code=401)


def require_permission(permission: str):
    async def dependency(principal: CurrentPrincipal = Depends(current_principal)) -> CurrentPrincipal:
        if permission in principal.permissions or has_permission(principal.roles, permission):
            return principal
        raise ApiError("PERMISSION_DENIED", "The principal lacks the required permission.", status_code=403)

    return dependency

