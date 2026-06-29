import sys
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from iitd_iam.database import SessionLocal
from iitd_iam.models import Application, Role, Permission, RolePermission, RoleScope

# GNS Permissions & Mappings
GNS_PERMISSIONS = [
    {"key": "gns.dashboard.view", "name": "View GNS Dashboard", "description": "Allows viewing the GNS dashboard"},
    {"key": "gns.templates.view", "name": "View GNS Templates", "description": "Allows viewing templates"},
    {"key": "gns.templates.create", "name": "Create GNS Templates", "description": "Allows creating templates"},
    {"key": "gns.templates.update", "name": "Update GNS Templates", "description": "Allows updating templates"},
    {"key": "gns.templates.delete", "name": "Delete GNS Templates", "description": "Allows deleting templates"},
    {"key": "gns.notifications.send", "name": "Send GNS Notifications", "description": "Allows sending notifications"},
    {"key": "gns.deliveries.view", "name": "View GNS Deliveries", "description": "Allows viewing deliveries"},
    {"key": "gns.deliveries.retry", "name": "Retry GNS Deliveries", "description": "Allows retrying deliveries"},
    {"key": "gns.providers.view", "name": "View GNS Providers", "description": "Allows viewing providers"},
    {"key": "gns.providers.manage", "name": "Manage GNS Providers", "description": "Allows managing providers"},
    {"key": "gns.api_keys.view", "name": "View GNS API Keys", "description": "Allows viewing API keys"},
    {"key": "gns.api_keys.manage", "name": "Manage GNS API Keys", "description": "Allows managing API keys"},
    {"key": "gns.audit.view", "name": "View GNS Audit Logs", "description": "Allows viewing audit logs"},
]

GNS_ROLES = {
    "gns_admin": [p["key"] for p in GNS_PERMISSIONS],
    "gns_operator": [
        "gns.dashboard.view", "gns.templates.view", "gns.templates.create", "gns.templates.update", "gns.templates.delete",
        "gns.notifications.send", "gns.deliveries.view", "gns.deliveries.retry", "gns.providers.view", "gns.providers.manage",
        "gns.api_keys.view", "gns.audit.view"
    ],
    "gns_developer": [
        "gns.dashboard.view", "gns.templates.view", "gns.templates.create", "gns.templates.update", "gns.templates.delete",
        "gns.notifications.send", "gns.deliveries.view", "gns.providers.view", "gns.api_keys.view", "gns.api_keys.manage",
        "gns.audit.view"
    ],
    "gns_viewer": [
        "gns.dashboard.view", "gns.templates.view", "gns.deliveries.view", "gns.providers.view", "gns.api_keys.view", "gns.audit.view"
    ]
}

async def _bootstrap_gns_rbac_tx(session: AsyncSession):
    # Lookup GNS Application
    app = await session.scalar(
        select(Application).where(Application.key == "gns-notification-service")
    )
    if not app:
        print("Error: Application 'gns-notification-service' not found. Please register it first.", file=sys.stderr)
        sys.exit(1)

    # Create/upsert permissions
    permissions_map = {}
    for p_data in GNS_PERMISSIONS:
        perm = await session.scalar(
            select(Permission)
            .where(Permission.application_id == app.id)
            .where(Permission.key == p_data["key"])
        )
        if not perm:
            perm = Permission(
                application_id=app.id,
                key=p_data["key"],
                name=p_data["name"],
                description=p_data["description"]
            )
            session.add(perm)
            await session.flush()
        else:
            perm.name = p_data["name"]
            perm.description = p_data["description"]
        permissions_map[p_data["key"]] = perm

    # Create/upsert roles
    for r_key, perm_keys in GNS_ROLES.items():
        role = await session.scalar(
            select(Role)
            .where(Role.application_id == app.id)
            .where(Role.key == r_key)
        )
        if not role:
            role = Role(
                application_id=app.id,
                key=r_key,
                name=r_key.replace("_", " ").title(),
                description=f"GNS Role for {r_key}",
                scope=RoleScope.application,
                is_active=True
            )
            session.add(role)
            await session.flush()
        else:
            role.is_active = True

        # Atomic replacement of mappings for this role
        # Delete existing mappings first
        from sqlalchemy import delete
        await session.execute(delete(RolePermission).where(RolePermission.role_id == role.id))

        # Insert new mappings
        for p_key in perm_keys:
            perm = permissions_map[p_key]
            session.add(RolePermission(role_id=role.id, permission_id=perm.id))


async def bootstrap_gns_rbac():
    async with SessionLocal() as session:
        # Check if already inside an active transaction (e.g. within backend test sessions)
        if session.in_transaction():
            async with session.begin_nested():
                await _bootstrap_gns_rbac_tx(session)
        else:
            async with session.begin():
                await _bootstrap_gns_rbac_tx(session)
        print("GNS RBAC bootstrapped successfully.")

def main():
    if len(sys.argv) < 2 or sys.argv[1] != "bootstrap-gns-rbac":
        print("Usage: python -m iitd_iam.cli bootstrap-gns-rbac")
        sys.exit(1)
    asyncio.run(bootstrap_gns_rbac())

if __name__ == "__main__":
    main()
