# Security Status

Last updated: 2026-07-20

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
- Live Keycloak OIDC discovery is reachable.
- IAM live readiness reports PostgreSQL, Redis and Keycloak as `ok`.
- Protected IAM APIs reject missing bearer tokens with `401 Authentication is required`.
- Frontend protected pages redirect unauthenticated users to `/login`.
- Admin UI uses Auth.js OIDC sign-in and reuses the session access token for protected IAM API calls.
- Keycloak direct password grant is disabled for the admin client, which prevents Resource Owner Password Credentials use.

Not yet verified:

- Full browser OIDC callback E2E on Netlify with an automated browser.
- `/api/v1/me` with a fresh real browser-issued Keycloak token.
- Session revocation through Keycloak in a live run.
- MFA policy enforcement.
- Secret manager integration.
- E2E security tests and scans.
- Live Compose dependency health.
- Live Keycloak admin operations.
