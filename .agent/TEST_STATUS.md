# Test Status

Last updated: 2026-07-20

Executed commands:

```bash
cd backend && pip install -e ".[test]" && pytest
cd frontend && npm install && npm run typecheck && npm run build
```

Actual result:

- `python3 -m compileall -q backend/src backend/tests`: passed.
- `pytest backend/tests`: 4 passed, 1 warning about `asyncio_mode` because `pytest-asyncio` was not installed in the ambient Python environment.
- `ruff check backend/src backend/tests`: passed.
- `npm install`: passed and generated `frontend/package-lock.json`.
- `npm run typecheck`: passed.
- `npm run build`: passed with escalated sandbox permissions because Next 16 Turbopack workers require local process/port capabilities blocked by the default sandbox.
- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities after upgrading to Next 16.2.9 and overriding PostCSS to the patched range.
- After adding integration docs/examples, `python3 -m compileall -q backend/src backend/tests examples/fastapi examples/service-client` passed.
- After adding integration docs/examples, `pytest backend/tests` passed: 4 passed.
- After bearer-token and Netlify UI changes, `pytest backend/tests` passed: 6 passed.
- After bearer-token and Netlify UI changes, `ruff check backend/src backend/tests` passed.
- After bearer-token and Netlify UI changes, `npm run typecheck`, `npm run build`, and `npm audit --audit-level=moderate` passed.
- After Auth.js OIDC UI changes, `npm run typecheck`, `npm run build`, `npm audit --audit-level=moderate`, and `pytest backend/tests` passed.
- After production-config and Keycloak-admin-client work, `pytest backend/tests` passed: 26 passed.
- After production-config and Keycloak-admin-client work, `ruff check backend/src backend/tests` passed.
- After production-config work, `npm run typecheck`, `npm run build`, and `npm audit --audit-level=moderate` passed.
- After frontend auth/session optimization, `npm run typecheck` passed.
- After frontend auth/session optimization, `npm run build` passed with escalated sandbox permissions because Next 16 Turbopack workers require local process/port capabilities blocked by the default sandbox.
- After Netlify OIDC issuer hardening, `npm run typecheck` passed.
- After Netlify OIDC issuer hardening, `npm run build` passed with escalated sandbox permissions.

Latest live HTTP checks:

```text
https://iitdeveloper-iam.hf.space/health/live                                  200
https://iitdeveloper-iam.hf.space/health/ready                                 200
https://iitdeveloper-keycloak.hf.space/realms/iitd/.well-known/openid-configuration 200
https://iitdeveloper-iam.hf.space/api/v1/applications without token            401
https://iam.iitdeveloper.com/login                                             200
https://iam.iitdeveloper.com/applications without session                      redirects to /login
```

Observed auth behavior:

- Keycloak direct password grant for `iitd-iam-admin` is disabled: `unauthorized_client`, `Client not allowed for direct access grants`. This is acceptable for production PKCE/OIDC browser login and prevents password-grant use.
- Local production Auth.js CSRF-backed provider signin POST redirected to Keycloak authorization endpoint.
- Plain `GET`/`HEAD` probes to Auth.js signin routes are not valid browser-equivalent signin tests and may return Auth.js error pages.

Not executed:

- Compose startup.
- Full browser E2E login with callback on Netlify using automated browser tooling.
- Keycloak admin-console SMTP/email delivery verification.
- Load tests.
- Container scan.
