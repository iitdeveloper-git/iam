# IAM-007: Application-Scoped RBAC Management UI & Backend Gaps

This document details the backend gaps and frontend administration console features implemented for IAM-007.

## 1. Backend Architecture

### 1.1 Database Extension
- **Model changes**: Added `is_active` boolean column to the `Role` model (`models.py`) with a database-level `server_default=sa.true()` to safely backfill existing records.
- **Migration**: Added Alembic schema revision `0003_role_is_active.py` to upgrade and downgrade this column cleanly.

### 1.2 Authorization & Scope Enforcement
- Scoped endpoint access is governed by the `verify_application_admin` helper in `routes.py`.
- Platform administrators can administer any application.
- Application-scoped administrators must possess a valid and active `ApplicationAccessGrant` for the target application to view or modify RBAC.

### 1.3 Roles & Permissions Updates
- **Role PATCH**: `/applications/{application_id}/roles/{role_id}` updates role name, description, and status (`is_active`). The role key is immutable and cannot be updated.
- **Permissions PUT**: `/applications/{application_id}/roles/{role_id}/permissions` replaces the permissions associated with a role in a single database transaction. 
  - Cross-application mapping attempts are rejected.
  - Platform permissions are rejected unless they exist in the allow-list: `{"platform.dashboard.view"}`.

### 1.4 Status-Based Revocation Cascade
- Revoking a user's access grant (`DELETE /applications/{application_id}/access-grants/{grant_id}`) triggers a transaction that marks the access grant as `revoked` and marks all active `UserRoleAssignment` records for that application as `revoked`.

### 1.5 Disabled Roles Exclusion
- Disabled roles (`is_active = False`) are excluded from effective permissions and role assignment calculations across all lookups.

---

## 2. Frontend Details

### 2.1 API Client hooks
Extended `frontend/lib/api/client.ts` to support:
- `getApplicationRoles(applicationId)`
- `createApplicationRole(applicationId, payload)`
- `updateRole(applicationId, roleId, payload)`
- `getPermissions(applicationId)`
- `getRolePermissions(applicationId, roleId)`
- `updateRolePermissions(applicationId, roleId, permissionIds)`
- `getApplicationAccessGrants(applicationId)`
- `grantApplicationAccess(applicationId, payload)`
- `revokeApplicationAccess(applicationId, grantId)`
- `getScopedAuditEvents(applicationId)`
- `revokeInvitation(invitationId)`

### 2.2 Tabbed URL-Backed Interface
- The layout page `/applications/[id]/layout.tsx` groups all features under static tabs:
  - **Overview** (`/applications/[id]`): Displays application metadata and current status.
  - **Roles** (`/applications/[id]/roles`): Lists roles, allows toggling role status, creating new roles, and updating permission matrices grouped by resource.
  - **Permissions** (`/applications/[id]/permissions`): Displays a searchable catalog of application-specific and allow-listed platform permissions.
  - **Users & Access** (`/applications/[id]/access`): Lists user access grants, active assignments, and supports granting/revoking access and roles.
  - **Invitations** (`/applications/[id]/invitations`): Lists pending, accepted, and revoked invitations scoped to the application, allowing creation and revocation.
  - **Audit** (`/applications/[id]/audit`): Displays application-specific audit events.
