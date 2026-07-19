# Local Development

Copy `.env.example` to `.env`, then run the local Docker stack:

```bash
cp .env.example .env
make start
```

`make start` builds the API and admin UI containers, starts PostgreSQL,
Redis and Keycloak, and runs Alembic migrations automatically before the
FastAPI container starts.

Common commands:

```bash
make build
make stop
make logs
make api-logs
make keycloak-logs
make reset
```
