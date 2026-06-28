# Deployment Architecture

Local deployment uses Podman-compatible Compose. Production should place IAM Admin UI, IAM API and Keycloak behind a managed load balancer or reverse proxy with TLS, managed PostgreSQL, managed Redis, a secret manager and central observability.

IAM and Keycloak use separate databases.

