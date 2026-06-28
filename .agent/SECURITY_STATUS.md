# Security Status

Implemented:

- Keycloak-first architecture.
- PostgreSQL-only settings validation.
- Redirect wildcard rejection.
- Production redirect HTTPS enforcement.
- Privilege escalation role-rank rule.
- Invitation token hashing.
- Secret-reference model for service accounts.
- Frontend dependency audit currently reports 0 vulnerabilities.

Not yet verified:

- Live OIDC token verification with Keycloak JWKS.
- Session revocation through Keycloak.
- MFA policy enforcement.
- Secret manager integration.
- E2E security tests and scans.
- Live Compose dependency health.
