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

Acceptance criteria: user/client/role/session/idp operations use typed Keycloak adapters with safe errors, token caching and no credential logging.

Dependencies: IAM-002.

Files: `backend/src/iitd_iam/integrations/keycloak/`.

Tests: unit and integration tests with mock Keycloak.

Status: IN_PROGRESS

## IAM-004

Description: Replace dev admin UI auth with real OIDC session handling.

Acceptance criteria: admin console signs in through Keycloak using Authorization Code Flow with PKCE and sends verified bearer tokens to the API.

Dependencies: IAM-003.

Files: `frontend/`, `backend/src/iitd_iam/auth/`.

Tests: E2E login smoke test.

Status: TODO
