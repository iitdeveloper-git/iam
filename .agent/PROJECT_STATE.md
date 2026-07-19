# Project State

Last updated: 2026-07-20

Current phase: live UAT validation and production hardening.

Current milestone: IAM API, Keycloak and admin UI are deployed and live-health verified.

Current task: complete browser E2E login/callback evidence and remaining production sign-off checks on `main`.

Completed work:

- Repository structure created.
- Product, architecture, engineering, operations and security docs added.
- FastAPI backend foundation added.
- PostgreSQL domain models and Alembic initial migration added.
- Permission and redirect security rules added with tests.
- Keycloak integration package foundation added.
- Next.js admin console shell and core pages added.
- Podman-compatible Compose stack added for PostgreSQL, Redis, Keycloak, IAM API, migrations and admin UI.
- Keycloak development realm and theme added.
- CI workflow added.
- Client integration documentation added for generic clients, FastAPI, Next.js, React SPA, machine-to-machine clients and GNS.
- API matrix added with honest implementation status.
- Backend now verifies OIDC bearer tokens with JWKS instead of returning a placeholder token error.
- Readiness now checks PostgreSQL, Redis and Keycloak discovery.
- Netlify UI no longer depends on development headers and sends `Authorization: Bearer` tokens from a browser session.
- Netlify UI now includes Auth.js OIDC sign-in route for Keycloak/IITD IAM.
- Netlify UI caches/reuses Auth.js session access tokens and avoids repeated per-page auth/health calls.
- Production configuration validation and tests added.
- Keycloak admin client typed methods and tests added.
- Consistency and reconciliation strategy documented.
- End-to-end invitation acceptance flow completed with atomic transactions and role assignment.

Incomplete work:

- Full browser E2E login/callback automation on Netlify.
- `/api/v1/me` verification with a fresh browser-issued access token.
- SMTP/email verification and invitation delivery.
- MFA policy enforcement verification.
- Complete CRUD endpoints for every specified action.
- Email/GNS integration.
- Service-account secret manager integration.
- Integration, E2E, load and security scan execution.
- Load, backup/restore and security/container scan execution.

Blockers:

- Automated browser tooling is not currently installed in the workspace.
- SMTP/GNS delivery, MFA policy, backup/restore and load-test evidence still need live execution.
- Network/package installation may be unavailable in the local sandbox.

Branch: `main`.

Latest relevant commits:

- `33af248 fix: optimize frontend auth session reuse`
- `853f765 fix: harden netlify oidc issuer config`

Migrations: `backend/alembic/versions/0001_initial_schema.py`, `backend/alembic/versions/0002_role_assignment_uniqueness.py`.

Running services:

- IAM API: `https://iitdeveloper-iam.hf.space`
- Keycloak: `https://iitdeveloper-keycloak.hf.space`
- Admin UI: `https://iam.iitdeveloper.com`

Test results: frontend typecheck passed; frontend production build passed with required sandbox permissions; live IAM `/health/live` and `/health/ready` returned `200`; live Keycloak discovery returned `200`; protected API without token returned `401`.

Security status: foundation controls implemented; live UAT checks healthy; final production verification incomplete.

Deployment status: Hugging Face IAM API, Hugging Face Keycloak and Netlify/custom-domain admin UI are live.

Next exact action: run browser E2E for login/callback/session reuse and then verify `/api/v1/me` with the browser-issued token.
