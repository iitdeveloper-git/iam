# Backup Restore Evidence

Status: `NOT_DONE`

No production-like backup and restore test has been executed yet.

Required before production candidate:

- Back up IITD IAM PostgreSQL.
- Back up Keycloak PostgreSQL.
- Back up Keycloak realm configuration.
- Preserve custom Keycloak theme.
- Restore into isolated environment.
- Run migration/version checks.
- Verify users, applications, clients, roles and audit records.
- Record restore duration and validation result.

Evidence template:

```text
Backup timestamp:
Restore timestamp:
Environment:
Database version:
Keycloak version:
Restore duration:
Validation commands:
Result:
Limitations:
```

