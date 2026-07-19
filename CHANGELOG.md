# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **[IAM-008](.agent/TASKS.md#iam-008)**: Modern Admin Console UI/UX revamp with compact enterprise shell, grouped responsive sidebar, sticky top navigation, profile menu, dashboard cards, application registry filters, and application detail overview.
- Added reusable frontend UI primitives for page headers, metric cards, status badges, filter toolbars, loading states, empty states, and error states.
- Added [IAM_008_UI_REVAMP.md](docs/IAM_008_UI_REVAMP.md) with scope, data-integrity notes, and verification status.
- **IAM-003**: End-to-end atomic invitation acceptance flow (`POST /invitations/accept`).
- Added robust scoped APIs for role management (`GET /roles`, `POST /applications/{id}/roles`, etc.).
- Soft lifecycle management for applications (`suspended` and `archived` states via `PATCH /applications/{id}`).
- Added 25 new comprehensive tests covering role assignments and the complete invitation lifecycle.
- Introduced `AssignmentSource` enum (`invitation`, `manual`, `system`) to `UserRoleAssignment`.
- **[IAM-007](.agent/TASKS.md#L87)**: Application-scoped RBAC management UI and backend support. Detailed design in [IAM_007_IMPLEMENTATION.md](docs/IAM_007_IMPLEMENTATION.md).
- Added `is_active` column to `Role` model with database-level `server_default=sa.true()`.
- Added `RoleUpdate` schema and role details PATCH endpoint.
- Added atomic cascaded role-assignment status-based revocation on application access grant revocation.
- Added `/invitations/{invitation_id}/revoke` API endpoint.
- Introduced GNS RBAC CLI command (documented in [GNS_IAM_RBAC.md](docs/GNS_IAM_RBAC.md)) to idempotently bootstrap application roles and permission mappings.
- Built a complete URL-backed tab layout for `/applications/[id]` featuring Overview, Roles, Permissions, Users & Access, Invitations, and Audit.

### Changed
- Updated live UAT documentation and agent status files to reflect current Hugging Face IAM API, Hugging Face Keycloak, Netlify admin console, readiness, protected API and client-integration evidence.
- Replaced the always-visible admin API session panel on console pages with a protected shell-level auth gate and top-right profile/session menu.
- Updated the frontend API client to bridge the signed-in Auth.js session token into IAM API requests automatically.
- Updated frontend Auth.js configuration to support Keycloak public clients using PKCE when `AUTH_IITD_CLIENT_SECRET` is not configured.
- Updated Next.js frontend config to load environment variables from both `frontend/.env` and the repository root `.env` for local development.
- Refactored `UserRoleAssignment` uniqueness constraint into two partial unique indexes (platform vs application-scoped) for cross-database consistency (SQLite and PostgreSQL).
- Invitation acceptance tokens are now safely passed in the request body instead of the URL path to prevent leakage in access logs.
- Filtered out disabled roles from effective role assignments and permissions calculations.
- Modified tests to use a centralized Base metadata setup in `conftest.py`.

### Fixed
- Fixed unauthenticated users being able to land on the admin console shell; protected pages now redirect to IAM sign-in before rendering.
- Fixed post-sign-in IAM API calls failing with `Authentication is required` by automatically using the Auth.js access token.
- Fixed an issue where the test suite would fail on collection due to missing `IAM_DATABASE_URL` by implementing a robust `conftest.py` setup.
- Fixed SQLite compatibility issues when running tests concurrently by reusing the mock Base metadata.
