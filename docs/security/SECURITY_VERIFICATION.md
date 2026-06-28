# Security Verification

| Control | Implementation | Test | Result | Evidence | Residual risk | Production action required |
| --- | --- | --- | --- | --- | --- | --- |
| No custom crypto | Keycloak owns auth protocols | Review | Implemented | Keycloak ADR | Keycloak config drift | Restrict admin access |
| Redirect safety | Validator blocks wildcards/prod HTTP | Unit | Passed | `pytest backend/tests` | Admin review still required | Review all prod redirects |
| Privilege escalation | Role-rank assignment rule | Unit | Passed | `pytest backend/tests` | Break-glass misuse | Enforce MFA |
| Plaintext invitation tokens | Hash stored; token shown once | Review | Implemented foundation | Invitation route | Email delivery not wired | Integrate GNS/SMTP |
| Production dev auth disabled | Settings validator rejects prod dev auth | Review | Implemented | `config.py` | Env misconfig | CI production config check |
| Dependency advisories | Next upgraded and PostCSS override added | npm audit | Passed | `npm audit --audit-level=moderate` | Future advisories | Run CI scans |
