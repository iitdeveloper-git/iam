# Security Verification

| Control | Implementation | Test | Result | Evidence | Residual risk | Production action required |
| --- | --- | --- | --- | --- | --- | --- |
| No custom crypto | Keycloak owns auth protocols | Review | Implemented | Keycloak ADR | Keycloak config drift | Restrict admin access |
| Redirect safety | Validator blocks wildcards/prod HTTP | Unit | Passed | `pytest backend/tests` | Admin review still required | Review all prod redirects |
| Privilege escalation | Role-rank assignment rule | Unit | Passed | `pytest backend/tests` | Break-glass misuse | Enforce MFA |
| Plaintext invitation tokens | Hash stored; token shown once | Review | Implemented foundation | Invitation route | Email delivery not wired | Integrate GNS/SMTP |
| Production dev auth disabled | Settings validator rejects production dev auth | Review/live HTTP | Partial | `config.py`, live protected API returns `401` without token | Formal production env audit pending | Verify HF/Netlify env exports and rotate secrets |
| Dependency advisories | Next upgraded and PostCSS override added | npm audit | Passed | `npm audit --audit-level=moderate` | Future advisories | Run CI scans |
| Bearer token verification | API validates OIDC JWTs with JWKS, issuer and audience | Unit/review/live HTTP | Partial | `pytest backend/tests` signed-token coverage; OIDC discovery `200`; protected API without token `401` | Browser-issued token `/api/v1/me` E2E pending | Run live OIDC browser E2E and JWKS rotation test |
| Development headers removed from UI | Netlify UI sends `Authorization: Bearer` instead of dev headers | Build/review | Passed | `npm run build` | Browser callback E2E pending | Keep UAT fallback restricted |
| Admin UI OIDC sign-in | Auth.js OIDC provider configured for IITD IAM/Keycloak | Build/typecheck/local auth POST | Passed foundation | `npm run typecheck`, `npm run build`, local CSRF POST redirects to Keycloak | Full Netlify browser callback not automated | Run Playwright/browser E2E |
| Keycloak admin client errors | Admin client normalizes failures without raw response bodies | Unit | Passed foundation tests | `pytest backend/tests/test_keycloak_client.py` | Live Keycloak behavior not verified | Add live Keycloak integration tests |
