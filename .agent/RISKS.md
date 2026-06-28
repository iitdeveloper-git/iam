# Risks

- Keycloak admin integration is currently foundational, not complete.
- Admin UI currently uses development headers for local API reads.
- Production readiness requires external infrastructure and secrets.
- CI depends on package registry access.
- The first migration should be validated against a live PostgreSQL instance before production use.

