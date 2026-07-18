# IAM-009: Dynamic Application-Scoped Permission Management

## Overview
IAM-009 introduces the ability for Application Administrators to dynamically create, edit, and manage custom permissions scoped specifically to their applications via the API and Admin Console. Previously, permissions could only be seeded through platform bootstrap scripts.

## Key Changes

### Database Models
- `permissions` table now includes `resource` (string), `action` (string), and `is_active` (boolean).
- Unique constraints on permissions are now implemented using **partial indexes**.
  - `uq_application_permission_key`: Unique by `application_id` and `key` for application-scoped permissions.
  - `uq_platform_permission_key`: Unique by `key` when `application_id IS NULL` for platform permissions.

### REST APIs
New Application-scoped API routes were added:
- `GET /applications/{id}/permissions`
- `POST /applications/{id}/permissions`
- `GET /applications/{id}/permissions/{perm_id}`
- `PATCH /applications/{id}/permissions/{perm_id}`
- `GET /applications/{id}/permissions/{perm_id}/roles`

### Permission Mapping Validation
- **Disabled Permissions:** The API rejects mapping of any permissions that are `is_active=False`.
- **Cross-Application Prevention:** Permissions belonging to Application A cannot be assigned to roles in Application B.

### User Interface
- A new interactive **Permissions Catalogue** for Application Admins to create and manage custom permissions, viewing resources, actions, and active/disabled statuses.
- The **Manage Permissions** modal on Roles groups permissions by type (Application vs Platform) and Resource, automatically dimming and disabling checkboxes for inactive permissions to prevent illegal assignments.
