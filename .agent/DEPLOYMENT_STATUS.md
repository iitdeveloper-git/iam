# Deployment Status

Last updated: 2026-07-20

Local:

- Compose file is present.
- `.env.example` is present.
- Keycloak realm import is present.
- Migration service is present.
- Compose services were not started in this session.

GitHub deployment:

- Backend workflow targets Hugging Face Space `iitdeveloper/iam` by default.
- Keycloak workflow targets Hugging Face Space `iitdeveloper/keycloak`.
- Frontend workflow targets Netlify using `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`.

Live endpoints checked:

- IAM API: `https://iitdeveloper-iam.hf.space`
- Keycloak: `https://iitdeveloper-keycloak.hf.space`
- Admin UI: `https://iam.iitdeveloper.com`

Latest live checks:

| Check | Result |
| --- | --- |
| IAM `/health/live` | `200` |
| IAM `/health/ready` | `200`, `api/postgres/redis/keycloak = ok` |
| Keycloak OIDC discovery | `200` |
| Protected API without token | `401 Authentication is required` |
| Netlify `/login` page | `200` |
| Netlify protected `/applications` without session | Redirects to `/login` |

UAT/Production-like deployment:

- Backend is live on Hugging Face.
- Keycloak is live on Hugging Face.
- Admin UI is live on Netlify/custom domain.
- Runtime Redis, PostgreSQL and Keycloak readiness are currently healthy.

Still pending before final production sign-off:

- Full browser E2E login/callback automation.
- SMTP/email verification delivery verification.
- Backup/restore drill.
- Load test and container scan.
- MFA policy enforcement verification.
- Formal secret manager and key rotation runbook execution.
