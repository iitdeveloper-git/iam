# Database Design

The initial Alembic migration creates the core V1 tables with foreign keys, unique constraints and important indexes for identity lookup, application lookup, invitation token lookup and audit filtering.

Production and integration environments must use PostgreSQL. SQLite fallback is intentionally unsupported.

