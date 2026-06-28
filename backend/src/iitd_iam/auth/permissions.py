PLATFORM_ROLE_ORDER = {
    "user": 10,
    "auditor": 20,
    "support_operator": 30,
    "application_admin": 40,
    "security_admin": 70,
    "platform_admin": 80,
    "super_admin": 100,
}

ROLE_PERMISSIONS = {
    "super_admin": {"*"},
    "platform_admin": {
        "platform.dashboard.view",
        "users.view",
        "users.create",
        "users.update",
        "users.suspend",
        "users.disable",
        "applications.view",
        "applications.create",
        "applications.update",
        "application_access.grant",
        "roles.assign",
        "invitations.create",
        "audit.view",
    },
    "security_admin": {
        "security.view",
        "security.configure",
        "security.sessions.revoke",
        "security.keys.rotate",
        "clients.rotate_secret",
        "audit.view",
    },
    "application_admin": {
        "applications.view",
        "applications.update",
        "application_access.view",
        "application_access.grant",
        "roles.view",
        "roles.assign",
    },
    "support_operator": {"users.view", "invitations.view", "invitations.resend", "users.sessions.revoke"},
    "auditor": {"audit.view", "security.view", "settings.view"},
    "user": {"platform.dashboard.view"},
}


def has_permission(role_keys: set[str], permission: str) -> bool:
    return any("*" in ROLE_PERMISSIONS.get(role, set()) or permission in ROLE_PERMISSIONS.get(role, set()) for role in role_keys)


def can_assign_role(actor_roles: set[str], target_role: str) -> bool:
    actor_rank = max((PLATFORM_ROLE_ORDER.get(role, 0) for role in actor_roles), default=0)
    return actor_rank > PLATFORM_ROLE_ORDER.get(target_role, 0)

