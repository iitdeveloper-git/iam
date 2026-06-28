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
- Production configuration validation rejects dev auth, UAT fallback, missing JWKS URL, insecure cookies, wildcard CORS, HTTP production redirect URLs, placeholder Keycloak admin secrets, and unsafe JWT algorithms.
- Signed JWT tests cover valid token, wrong issuer, wrong audience and expired token.
- Keycloak admin client normalizes admin request errors.

Not yet verified:

- Live OIDC token verification with Keycloak JWKS.
- Session revocation through Keycloak.
- MFA policy enforcement.
- Secret manager integration.
- E2E security tests and scans.
- Live Compose dependency health.
- Live Keycloak token verification.
- Live Keycloak admin operations.
