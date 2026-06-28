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

## Backend API

| Feature | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| OpenAPI export | DONE | `openapi.json` | Regenerate before every release |
| Health live | DONE | `/health/live` | None |
| Health ready | PARTIAL | Checks API/PostgreSQL/Redis/Keycloak in code | Verify against live managed services |
| Metrics endpoint | DONE | `/metrics` | Add business metrics |
| Stable error envelope | PARTIAL | `ApiError` handler | Convert FastAPI validation errors to same envelope |
| OIDC bearer verification | DONE | `TokenVerifier`, tests | Live Keycloak token E2E |
| Dev auth disabled in production | DONE | settings validator | Confirm production env |
| Users list/create/get/suspend | PARTIAL | routes exist | Complete restore/disable/sessions/application access |
| Applications list/create/get | PARTIAL | routes exist | Complete patch/disable/restore/delete |
| Environments create | PARTIAL | route exists | Complete list/patch/promote |
| Redirect URI validation | DONE | unit tests | Live client sync to Keycloak |
| Application access grant | PARTIAL | route exists | Complete update/delete/revoke/expire logic |
| Role assignment privilege guard | DONE | unit tests | Persist assignment rows and audit |
| Invitations create/list | PARTIAL | route exists, token hash stored | Accept/resend/revoke/email delivery |
| Audit list | PARTIAL | route exists | Write audit events for all mutations |
| OAuth client CRUD | NOT_DONE | API matrix | Implement Keycloak client orchestration |
| Secret rotation | NOT_DONE | API matrix | Secret manager and show-once flow |
| Service accounts | NOT_DONE | API matrix | Client Credentials provisioning |
| Security settings | NOT_DONE | API matrix | Keycloak policy projection |
| Session revocation | NOT_DONE | API matrix | Keycloak admin sessions integration |

## Frontend UI

| Feature | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| TypeScript Next.js app | DONE | `frontend/`, `npm run typecheck` | None |
| Netlify-compatible build | DONE | `netlify.toml`, `npm run build` | Live Netlify deployment check |
| Dashboard | PARTIAL | UI page exists | Wire live metrics |
| Applications page | PARTIAL | UI page calls API | Add create/edit/detail flows |
| Users page | PARTIAL | UI page calls API | Add detail/lifecycle/session actions |
| Invitations page | PARTIAL | UI shell exists | Add create/resend/revoke/accept UI |
| Security page | PARTIAL | UI shell exists | Wire policy and event data |
| Audit page | PARTIAL | UI shell exists | Wire filters/export |
| Developer page | PARTIAL | UI shell exists | Generate app-specific config |
| Auth.js OIDC sign-in | PARTIAL | `/api/auth/[...nextauth]` builds | Live callback verification with Netlify + Keycloak |
| Bearer-token UAT fallback | DONE | `AuthTokenPanel` | Remove or restrict after full SSO |

## Keycloak

| Feature | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Development realm import | PARTIAL | `docker/keycloak/realm-iitd.json` | Verify live import |
| Theme files | PARTIAL | `keycloak/themes/iitd` | Visual verification and full screen coverage |
| Token verification integration | DONE | backend verifier | Live token E2E |
| Admin client module | PARTIAL | `integrations/keycloak/client.py` | Full admin operations |
| Users sync | NOT_DONE | planned | Implement create/update/suspend sync |
| Client provisioning | NOT_DONE | planned | Implement create/update/rotate/delete |
| Role mapper configuration | NOT_DONE | planned | Configure claims for app roles/permissions |
| Session revocation | NOT_DONE | planned | Implement admin session API calls |
| MFA policy projection | NOT_DONE | planned | Implement Keycloak policy reads/writes |

## Infrastructure And Deployment

| Feature | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Docker API image | DONE | `Dockerfile.api` | Container scan |
| Docker admin image | DONE | `Dockerfile.admin` | Optional if Netlify is primary |
| Compose local stack | PARTIAL | `compose.yaml` | Run and verify locally |
| Hugging Face backend workflow | DONE | GitHub workflow | Confirm latest `uat` deploy |
| Netlify frontend workflow | DONE | GitHub workflow | Confirm live Netlify deploy |
| Production PostgreSQL | BLOCKED | env required | Configure managed database and run migrations |
| Production Redis | BLOCKED | env required | Configure managed Redis |
| Production Keycloak | BLOCKED | env/domain required | Configure realm, clients, SMTP, MFA |
| DNS/TLS | BLOCKED | external | Configure production domains |
| Secret manager | BLOCKED | external | Configure provider and rotate secrets |

## Testing

| Test Area | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Backend unit tests | DONE | `pytest backend/tests`: 6 passed | Expand coverage |
| Redirect validation tests | DONE | `test_security_rules.py` | None |
| Privilege escalation tests | DONE | `test_security_rules.py` | Add DB-backed tests |
| Token claim extraction tests | DONE | `test_token_claims.py` | Add real signed JWT tests |
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
| JWT verification | DONE | OIDC verifier | Live issuer/audience validation |
| Redirect wildcard rejection | DONE | tests | None |
| Production HTTP redirect rejection | DONE | tests | None |
| No plaintext invitation tokens | DONE | token hash route | Complete accept/revoke flow |
| No browser Keycloak admin credentials | DONE | architecture/UI | Keep invariant |
| Admin MFA | BLOCKED | Keycloak config required | Enable and verify |
| Audit event coverage | PARTIAL | schema/list route | Write events for all mutations |
| Secret rotation | NOT_DONE | planned | Implement |
| CSRF protection | PARTIAL | Auth.js defaults for auth routes | Review mutation endpoints |
| Rate limiting | NOT_DONE | Redis planned | Implement |

## Release Verdict

Current verdict: **UAT-ready foundation, not production-complete**.

Required before production claim:

1. Live Netlify admin login through Keycloak verified.
2. Live Hugging Face API verifies real Keycloak tokens.
3. Managed PostgreSQL migrations verified.
4. Redis and Keycloak readiness verified in production.
5. Keycloak admin operations implemented.
6. Client provisioning, secret rotation and service accounts implemented.
7. Invitation accept/resend/revoke implemented.
8. Audit events written for all security-sensitive mutations.
9. E2E tests pass for login, onboarding, invitations, roles, suspension and machine clients.
10. Security, dependency and container scans pass.
11. Backup/restore and incident runbooks are validated.

