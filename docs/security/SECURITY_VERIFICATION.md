# Security Verification

| Control | Implementation | Test | Result | Evidence | Residual risk | Production action required |
| --- | --- | --- | --- | --- | --- | --- |
| No custom crypto | Keycloak owns auth protocols | Review | Implemented | Keycloak ADR | Keycloak config drift | Restrict admin access |
| Redirect safety | Validator blocks wildcards/prod HTTP | Unit | Passed | `pytest backend/tests` | Admin review still required | Review all prod redirects |
| Privilege escalation | Role-rank assignment rule | Unit | Passed | `pytest backend/tests` | Break-glass misuse | Enforce MFA |
| Plaintext invitation tokens | Hash stored; token shown once | Review | Implemented foundation | Invitation route | Email delivery not wired | Integrate GNS/SMTP |
| Production dev auth disabled | Settings validator rejects production dev auth | Review | Partial | `config.py` | Production environment not independently verified | Verify HF/production runtime env |
| Dependency advisories | Next upgraded and PostCSS override added | npm audit | Passed | `npm audit --audit-level=moderate` | Future advisories | Run CI scans |
| Bearer token verification | API validates OIDC JWTs with JWKS, issuer and audience | Unit/review | Partial | `pytest backend/tests` signed-token coverage | Live Keycloak configuration required | Run live OIDC E2E and JWKS rotation test |
| Development headers removed from UI | Netlify UI sends `Authorization: Bearer` instead of dev headers | Build/review | Passed | `npm run build` | Token paste bridge is not full SSO | Implement Auth.js/Keycloak sign-in |
| Admin UI OIDC sign-in | Auth.js OIDC provider configured for IITD IAM/Keycloak | Build/typecheck | Passed in code | `npm run typecheck`, `npm run build` | Live callback not yet verified | Configure Netlify and Keycloak callback |
| Keycloak admin client errors | Admin client normalizes failures without raw response bodies | Unit | Passed foundation tests | `pytest backend/tests/test_keycloak_client.py` | Live Keycloak behavior not verified | Add live Keycloak integration tests |
