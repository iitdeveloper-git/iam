# Acceptance Criteria

- Keycloak runs with PostgreSQL and imports the `iitd` realm.
- IAM API requires PostgreSQL and exposes `/health/live`, `/health/ready`, `/metrics` and `/api/v1`.
- Redis is available for rate limiting, token cache and future distributed locks.
- Admin UI connects to the API and exposes dashboard, applications, users, invitations, security, audit and developer integration pages.
- Redirect URI validation blocks wildcards and production HTTP/localhost redirects.
- Backend authorization prevents lower roles from assigning higher platform roles.
- Secrets are represented by references after creation and are not logged or returned repeatedly.
- Production deployment checklist identifies all external blockers.

