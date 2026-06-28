# Consistency And Reconciliation

Status: `PARTIAL`

IITD IAM writes to its own PostgreSQL database and also mutates Keycloak through the Admin API. These operations cannot share one database transaction.

## Required Operation States

```text
pending
provisioning
active
failed
retrying
disabled
deleting
reconciled
```

## Required Reconciliation Behavior

The future reconciliation job must:

1. Load pending, retrying and failed provisioning operations.
2. Fetch actual state from Keycloak.
3. Compare Keycloak state to IAM desired state.
4. Retry safe operations.
5. Mark terminal failures for manual repair.
6. Emit audit events for every attempt.
7. Avoid logging secrets, tokens or raw credential errors.

## Release Gate

This area remains `PARTIAL` until implementation and tests cover:

- successful provisioning
- transient Keycloak failure
- permanent Keycloak failure
- duplicate idempotency keys
- IAM database rollback
- Keycloak partial success
- reconciliation after restart

