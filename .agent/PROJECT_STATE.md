# Project State

Current phase: UAT end-to-end completion.

Current milestone: Greenfield V1 foundation created from master build prompt.

Current task: Continue UAT end-to-end completion on branch `uat`.

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

Incomplete work:

- Full Keycloak admin operations.
- Live validation of automatic OIDC sign-in in admin UI against Netlify and Keycloak callback settings.
- Complete CRUD endpoints for every specified action.
- Email/GNS integration.
- End-to-end invitation acceptance.
- Service-account secret manager integration.
- Integration, E2E, load and security scan execution.
- Staging and production deployment verification.

Blockers:

- No production DNS, TLS, SMTP/GNS credentials, cloud account, managed database, managed Redis or secret manager credentials are available.
- Network/package installation may be unavailable in the local sandbox.

Branch: `uat`.

Last commit: `ea2f1ed Add OIDC bearer token integration bridge` before the current Auth.js commit.

Migrations: `backend/alembic/versions/0001_initial_schema.py`.

Running services: not started by this session.

Test results: Python syntax compile passed; backend unit tests passed; Ruff passed; frontend typecheck passed; frontend production build passed with required sandbox permissions; npm audit reports zero vulnerabilities. Latest backend tests: 6 passed. Latest frontend build includes `ƒ /api/auth/[...nextauth]`.

Security status: foundation controls implemented; production verification incomplete.

Deployment status: local Compose artifacts ready; staging/production blocked by external infrastructure.

Next exact action: configure Netlify `AUTH_*` variables and Keycloak callback URL, then live-test `/api/auth/signin/iitd-iam`.
