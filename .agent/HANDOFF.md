# Handoff

Last updated: 2026-07-20

IITD IAM V1 is now a live UAT-ready identity platform with deployed IAM API, deployed Keycloak and deployed Netlify admin console. It includes docs, backend, frontend, database migrations, Compose runtime, Keycloak realm/theme, CI, security tests and deployment workflows.

Verified complete:

- File scaffold and source artifacts created.
- Documentation now distinguishes live UAT readiness from final production sign-off.
- Security-sensitive local rules have tests.
- Backend syntax compile, unit tests and Ruff checks passed.
- Frontend typecheck, production build and npm audit passed.
- Integration docs and examples now explain how clients use IAM from their own app/server.
- Backend OIDC bearer token verification is implemented.
- Netlify UI uses Auth.js OIDC sign-in support at `/api/auth/signin/iitd-iam`.
- Netlify UI reuses the Auth.js session access token and sends protected IAM API calls with `Authorization: Bearer`.
- Live IAM `/health/ready` returns `200` with `api/postgres/redis/keycloak = ok`.
- Live Keycloak OIDC discovery returns `200`.
- Protected IAM APIs reject unauthenticated requests with `401`.

Pending verification:

- Full browser E2E login/callback automation on Netlify.
- `/api/v1/me` with a fresh browser-issued access token.
- SMTP/email verification and invitation delivery.
- MFA policy enforcement.
- Backup/restore drill, load test and container scan.

Next action:

```bash
Run automated browser E2E for Netlify login, callback, console access and protected API loading.
```

Known limitations:

- Final production sign-off is not complete until browser E2E, SMTP, MFA, backup/restore, load and security scan evidence are captured.
- Keycloak direct password grant is disabled for the admin client; this is expected for PKCE/OIDC login.
