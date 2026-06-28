# Decisions

- Use Keycloak for all protocol and cryptographic identity behavior.
- Keep IAM and Keycloak PostgreSQL databases separate.
- Reject SQLite fallback.
- Allow development header auth only when explicitly configured and never in production.
- Store invitation token hashes, not plaintext tokens.
- Use a role-rank model to prevent lower admins assigning higher platform roles.

