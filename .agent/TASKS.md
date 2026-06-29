# Tasks

## IAM-001

Description: Create greenfield V1 foundation.

Acceptance criteria: docs, backend, frontend, migrations, Compose, Keycloak realm/theme, CI and agent state exist.

Dependencies: master build prompt.

Files: repository-wide.

Tests: backend unit tests pending dependency availability.

Status: DONE

## IAM-002

Description: Verify scaffold and fix local syntax/type issues.

Acceptance criteria: backend unit tests pass; frontend typecheck/build pass where dependencies are available.

Dependencies: IAM-001.

Files: `backend/`, `frontend/`.

Tests: `pytest`, `npm run typecheck`, `npm run build`.

Status: DONE

## IAM-003

Description: Complete Keycloak admin integration.

Acceptance criteria: user/client/role/session/idp operations use typed Keycloak adapters with safe errors, token caching and no credential logging; methods are wired into IAM services with consistency tracking and live-tested.

Dependencies: IAM-002.

Files: `backend/src/iitd_iam/integrations/keycloak/`.

Tests: unit tests with mock Keycloak, integration tests with live Keycloak.

Status: DONE

## IAM-005

Description: Production configuration validation.

Acceptance criteria: production rejects missing JWKS URL, dev auth, UAT fallback, debug mode, insecure cookies, wildcard CORS, HTTP production redirect URLs, placeholder admin secrets and unsafe JWT algorithms.

Dependencies: IAM-002.

Files: `backend/src/iitd_iam/config.py`, `backend/tests/test_production_config.py`, `docs/operations/PRODUCTION_CONFIGURATION.md`.

Tests: `pytest backend/tests/test_production_config.py`.

Status: DONE

## IAM-006

Description: Distributed consistency and provisioning operation persistence.

Acceptance criteria: IAM records provisioning operations with idempotency keys, retryable status, external resource IDs, redacted failure reasons and reconciliation hooks.

Dependencies: IAM-003.

Files: backend models, migration, services, tests, consistency docs.

Tests: unit and integration tests for success, failure, duplicate idempotency and retry state.

Status: TODO

## IAM-004

Description: Replace dev admin UI auth with real OIDC session handling.

Acceptance criteria: admin console signs in through Keycloak using Authorization Code Flow with PKCE and sends verified bearer tokens to the API.

Dependencies: IAM-003.

Files: `frontend/`, `backend/src/iitd_iam/auth/`.

Tests: E2E login smoke test.

Status: TODO

## IAM-007

Description: Application RBAC UI and backend gaps.

Acceptance criteria: application lifecycle administration, active/disabled roles management, permission replacement, access grant revocation cascades, and GNS CLI bootstrap.

Dependencies: IAM-003.

Files: `backend/`, `frontend/`, `docs/`, migration.

Tests: `pytest tests/test_app_rbac.py` and frontend builds.

Status: DONE

