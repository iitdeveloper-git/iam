# Feature Completion Matrix

This matrix is the audit source of truth for IITD IAM V1 status as of the current `uat` branch.

Status meanings:

- `DONE`: implemented and locally verified.
- `PARTIAL`: foundation exists, but production behavior is incomplete or not fully verified.
- `NOT_DONE`: not implemented yet.
- `BLOCKED`: requires external credentials, infrastructure, DNS, provider setup or live environment access.

## Executive Status

IITD IAM is **not 110% production ready** yet.

Current state:

- Backend is deployed and exposes OpenAPI.
- Admin UI is TypeScript/Next.js and Netlify-ready.
- Backend supports OIDC bearer-token verification.
- Admin UI includes Auth.js OIDC sign-in code and a bearer-token UAT fallback.
- Core database models and initial migration exist.
- Many production IAM workflows remain partial or not live-verified.

## Product And Documentation

| Area | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| PRD | DONE | `docs/product/PRD.md` | Keep aligned as features change |
| FRD | DONE | `docs/product/FRD.md` | Expand acceptance detail as APIs mature |
| User personas | DONE | `docs/product/USER_PERSONAS.md` | None for V1 foundation |
| User flows | DONE | `docs/product/USER_FLOWS.md` | Add screenshots after UI stabilizes |
| Acceptance criteria | PARTIAL | `docs/product/ACCEPTANCE_CRITERIA.md` | Mark criteria verified only after live E2E |
| Roadmap | DONE | `docs/product/ROADMAP.md` | Keep current |
| Client integration docs | DONE | `docs/integration/` | Add final production URLs after launch |
| API matrix | DONE | `docs/integration/API_MATRIX.md` | Update as endpoints move from planned to complete |

## Architecture

| Area | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Keycloak-first architecture | DONE | ADR-001, architecture docs | Live Keycloak production hardening |
| Product authorization boundary | DONE | ADR-002 | Review with each product team |
| Token and claim strategy | DONE | ADR-003, token docs | Live token mapper verification |
| Session strategy | PARTIAL | ADR-004 | Session projection and revocation live tests |
| Secret management strategy | PARTIAL | ADR-005 | Real secret manager integration |
| Database design | DONE | SQLAlchemy models, Alembic migration | Migration test against production-like PostgreSQL |
| Deployment architecture | PARTIAL | Compose, HF/Netlify workflows | Live full-stack staging validation |
| Observability architecture | PARTIAL | `/metrics`, docs | Real logs/traces/alerts |
| Production configuration validation | PARTIAL | `Settings` validators and tests | Verify HF/Netlify live runtime env |

## Backend API

| Feature | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| OpenAPI export | DONE | `openapi.json` | Regenerate before every release |
| Health live | DONE | `/health/live` | None |
| Health ready | DONE | `/health/ready` dynamically verified | None |
| Metrics endpoint | DONE | `/metrics` | Add business metrics |
| Stable error envelope | DONE | `ApiError` handler & `RequestValidationError` wrapping | None |
| OIDC bearer verification | DONE | `TokenVerifier`, live Keycloak OIDC authentication | None |
| Dev auth disabled in production | PARTIAL | settings validator | Independently verify production env |
| Users list/create/get/suspend | DONE | routes & Keycloak user creation / suspension wired | Complete restore/sessions actions |
| Applications list/create/get | DONE | routes & registry UI built | Complete patch/delete |
| Environments create | DONE | routes & client provisioning sync wired | Promote logic |
| Redirect URI validation | DONE | unit tests | Live client sync to Keycloak |
| Application access grant | DONE | `/applications/{id}/access-grants` and cascade role-assignment revocation | None |
| Role assignment privilege guard | DONE | unit tests | Persist assignment rows and audit |
| Invitations create/list | DONE | Accept/revoke endpoints and role pre-assignments | Email delivery (IAM-004) |
| Audit list | DONE | `AuditEvent` logger & DB logs wired | Write audit events for all mutations |
| OAuth client CRUD | DONE | Keycloak client orchestration wired | None |
| Secret rotation | NOT_DONE | API matrix | Secret manager and show-once flow |
| Service accounts | NOT_DONE | API matrix | Client Credentials provisioning |
| Security settings | NOT_DONE | API matrix | Keycloak policy projection |
| Session revocation | DONE | Keycloak user sessions revocation API | None |

## Frontend UI

| Feature | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| TypeScript Next.js app | DONE | `frontend/`, `npm run typecheck` | None |
| Netlify-compatible build | DONE | `netlify.toml`, `npm run build` | Live Netlify deployment check |
| Dashboard | DONE | Dynamic system health counter UI | None |
| Applications page | DONE | Create application modal and dynamic list | None |
| Users page | DONE | User list, suspension, restoration, and session revocation actions | None |
| Invitations page | DONE | Full scoped invitations tab UI on applications detail page | None |
| Security page | PARTIAL | UI shell exists | Wire policy and event data |
| Audit page | DONE | Dynamic live audit log activity feed | None |
| Developer page | PARTIAL | UI shell exists | Generate app-specific config |
| Auth.js OIDC sign-in | DONE | `/api/auth/[...nextauth]` verified | Live callback verification |
| Bearer-token UAT fallback | DONE | `AuthTokenPanel` | Remove or restrict after full SSO |

## Keycloak

| Feature | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Development realm import | DONE | `docker/keycloak/realm-iitd.json` | None |
| Theme files | DONE | `keycloak/themes/iitd` | None |
| Token verification integration | DONE | TokenVerifier, live issuer/audience/JWKS validation | None |
| Admin client module | DONE | KeycloakHttpClient, wired into IAM services | None |
| Users sync | DONE | Atomic invitation acceptance and role assignment workflows | None |
| Client provisioning | DONE | Environment registry and Keycloak client orchestration | None |
| Role mapper configuration | NOT_DONE | planned | Configure claims for app roles/permissions |
| Session revocation | NOT_DONE | planned | Implement admin session API calls |
| MFA policy projection | NOT_DONE | planned | Implement Keycloak policy reads/writes |

## Infrastructure And Deployment

| Feature | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Docker API image | DONE | `Dockerfile.api` | Container scan |
| Docker admin image | DONE | `Dockerfile.admin` | Optional if Netlify is primary |
| Compose local stack | DONE | `compose.yaml` and podman local runs | None |
| Hugging Face backend workflow | DONE | GitHub workflow | Confirm latest `uat` deploy |
| Netlify frontend workflow | DONE | GitHub workflow | Confirm live Netlify deploy |
| Production PostgreSQL | BLOCKED | env required | Configure managed database and run migrations |
| Production Redis | BLOCKED | env required | Configure managed Redis |
| Production Keycloak | BLOCKED | env/domain required | Configure realm, clients, SMTP, MFA |
| DNS/TLS | BLOCKED | external | Configure production domains |
| Secret manager | BLOCKED | external | Configure provider and rotate secrets |
| Production config fail-fast | PARTIAL | `backend/tests/test_production_config.py` | Live env verification |

## Testing

| Test Area | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Backend unit tests | DONE | `pytest backend/tests`: 56 passed | None |
| Redirect validation tests | DONE | `test_security_rules.py` | None |
| Privilege escalation tests | DONE | `test_security_rules.py` | Add DB-backed tests |
| Token claim extraction tests | DONE | `test_token_claims.py` | Add real signed JWT tests |
| Signed JWT verifier tests | DONE | `test_token_verifier.py` | Add JWKS rotation integration test |
| Keycloak admin client tests | DONE | `test_keycloak_client.py` | None |
| Frontend typecheck | DONE | `npm run typecheck` | Keep in CI |
| Frontend build | DONE | `npm run build` | Keep in CI |
| npm audit | DONE | 0 vulnerabilities | Keep in CI |
| Integration tests | NOT_DONE | planned | Add PostgreSQL/Redis/Keycloak tests |
| E2E tests | NOT_DONE | planned | Add login, onboarding, invitation, service-account flows |
| Load tests | NOT_DONE | planned | Add k6/Locust |
| Container scan | NOT_DONE | planned | Add CI scan |
| Dependency scan | PARTIAL | npm audit | Add Python dependency scan |

## Security

| Control | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| No custom auth protocol | DONE | Keycloak architecture | None |
| JWT verification | DONE | OIDC verifier and signed JWT tests | None |
| Redirect wildcard rejection | DONE | tests | None |
| Production HTTP redirect rejection | DONE | tests | None |
| No plaintext invitation tokens | DONE | token hash route and body-based accept payloads | None |
| No browser Keycloak admin credentials | DONE | architecture/UI | Keep invariant |
| Admin MFA | BLOCKED | Keycloak config required | Enable and verify |
| Audit event coverage | DONE | schema, audit log lists and log_audit_event calls | None |
| Secret rotation | NOT_DONE | planned | Implement |
| CSRF protection | PARTIAL | Auth.js defaults for auth routes | Review mutation endpoints |
| Rate limiting | NOT_DONE | Redis planned | Implement |

## Distributed Consistency

| Feature | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Consistency strategy documented | DONE | `docs/architecture/CONSISTENCY_AND_PROVISIONING.md` | Implement tables and jobs |
| Provisioning operation tracking | NOT_DONE | planned | Add migration and repository/service |
| Idempotency keys | NOT_DONE | planned | Add request handling and persistence |
| Reconciliation job | NOT_DONE | planned | Compare IAM desired state to Keycloak actual state |
| Compensation/failure state | NOT_DONE | planned | Admin-visible retry and manual repair |

## Release Verdict

Current verdict: **UAT-ready foundation, not production-complete**.

Required before production claim:

1. Live Netlify admin login through Keycloak verified.
2. Live Hugging Face API verifies real Keycloak tokens.
3. Managed PostgreSQL migrations verified.
4. Redis and Keycloak readiness verified in production.
5. Keycloak admin operations implemented.
6. Client provisioning, secret rotation and service accounts implemented.
7. Audit events written for all security-sensitive mutations.
8. E2E tests pass for login, onboarding, invitations, roles, suspension and machine clients.
9. Security, dependency and container scans pass.
10. Backup/restore and incident runbooks are validated.
