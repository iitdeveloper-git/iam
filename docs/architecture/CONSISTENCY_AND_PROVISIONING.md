# Consistency And Provisioning Strategy

IITD IAM changes two systems during many administrative workflows:

- IITD IAM PostgreSQL
- Keycloak Admin API

These systems do not share a single database transaction. Production workflows must therefore use explicit consistency controls instead of assuming all writes succeed together.

## Problem Example

```text
Admin creates application
→ IAM database application row is inserted
→ Keycloak client creation fails
```

Without an explicit strategy, IAM and Keycloak drift. That is unacceptable for an identity platform.

## Required Pattern

Every workflow that mutates both IAM and Keycloak should use:

- Operation status: `pending`, `active`, `failed`, `retrying`, `reconciled`.
- Idempotency key for externally retried requests.
- Provisioning attempt record.
- Correlation ID across IAM logs, audit events and Keycloak calls.
- Retry policy for safe operations.
- Compensation or admin-visible failed state for unsafe operations.
- Reconciliation job that compares IAM desired state with Keycloak actual state.
- Audit event for every attempt and final result.

## Recommended Table

Future migration:

```text
provisioning_operations
├── id
├── operation_type
├── idempotency_key
├── resource_type
├── resource_id
├── desired_state
├── external_system
├── external_resource_id
├── status
├── attempt_count
├── last_error_code
├── last_error_message_redacted
├── next_retry_at
├── created_by_user_id
├── created_at
└── updated_at
```

## Workflow Contract

1. Validate request.
2. Create IAM row in `pending` state.
3. Create provisioning operation with idempotency key.
4. Commit IAM transaction.
5. Call Keycloak with correlation ID.
6. On success, store external IDs and mark IAM row `active`.
7. On failure, mark operation `failed` or `retrying`; do not hide drift.
8. Emit audit event without secrets.
9. Reconciliation job retries or flags manual action.

## Operations That Need This Pattern

- User create/update/disable/suspend.
- OAuth client create/update/disable/delete.
- Redirect URI synchronization.
- Client secret rotation.
- Service-account provisioning.
- Role and mapper configuration.
- Session revocation.
- Identity provider configuration.

## Release Gate

Client and user provisioning must not be marked production-complete until this pattern is implemented and tested with:

- Keycloak success.
- Keycloak transient failure.
- Keycloak permanent validation failure.
- IAM database rollback.
- Duplicate idempotency key.
- Reconciliation after partial success.

