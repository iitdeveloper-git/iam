# Live UAT Evidence

Status: `PARTIAL`

Last updated: 2026-07-20

Verified live evidence:

```text
Frontend URL:
https://iam.iitdeveloper.com

Backend URL:
https://iitdeveloper-iam.hf.space

Keycloak issuer:
https://iitdeveloper-keycloak.hf.space/realms/iitd

IAM /health/live:
200

IAM /health/ready:
200
api/postgres/redis/keycloak = ok

Keycloak OIDC discovery:
200

Netlify /login:
200

Protected /applications without session:
redirects to /login

Protected IAM API without token:
401 Authentication is required

Local production Auth.js provider POST:
redirects to Keycloak authorization endpoint

Timestamp:
2026-07-20
```

Known limitation:

- Direct password grant is disabled for `iitd-iam-admin`, so password-based token testing is not available. This is acceptable for OIDC Authorization Code Flow with PKCE.

Not yet verified:

- Full browser callback on Netlify with automated browser tooling.
- `/api/v1/me` with a fresh browser-issued Keycloak access token.
- SMTP/email verification and invitation delivery.
- MFA policy enforcement.
- Backup/restore and load tests.

Required evidence before final production sign-off:

```text
Frontend URL:
Backend URL:
Keycloak issuer:
Admin login test result:
Token verification test result:
Readiness result:
Timestamp:
```
