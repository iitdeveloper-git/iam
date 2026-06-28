# Threat Model

| Asset | Threat | Attack path | Mitigation | Detection | Residual risk | Test |
| --- | --- | --- | --- | --- | --- | --- |
| Credentials | Credential stuffing | Reused passwords against login | Keycloak brute-force controls, MFA for admins | Failed-login metrics | User password reuse | Keycloak auth failure E2E |
| Sessions | Session theft | Stolen refresh token | Rotation, revocation, secure cookies | Session anomaly audit | Endpoint compromise | Revocation tests |
| Tokens | JWT confusion | Forged token or wrong alg | Algorithm allowlist, JWKS validation | Token verification failures | Misconfigured clients | Security tests |
| Redirects | Open redirect | Malicious redirect URI | Exact matching, no wildcards, prod HTTPS | Redirect validation errors | Admin misconfiguration | Unit tests |
| Admin rights | Privilege escalation | Lower admin assigns higher role | Role-rank enforcement | Audit events | Break-glass misuse | Unit tests |
| Secrets | Client-secret leakage | Logs or repeated API reads | Show once, store references | Secret scan | Operator exfiltration | Secret leakage tests |
| Invitations | Link replay | Reuse invitation token | Hash storage, expiry, single-use state | Invitation failures | Email compromise | Replay tests |
| Audit | Tampering | Editing audit rows | Append-only policy and restricted DB rights | Audit gaps | DBA access | DB permission review |
| Availability | DoS | Request flood | Rate limits, Redis, reverse proxy | Error-rate alerts | Volumetric attack | Load tests |
| Dependencies | Supply-chain compromise | Vulnerable package | CI scanning and SBOM | Scan alerts | Zero-days | Dependency scan |

