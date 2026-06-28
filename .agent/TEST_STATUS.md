# Test Status

Executed commands:

```bash
cd backend && pip install -e ".[test]" && pytest
cd frontend && npm install && npm run typecheck && npm run build
```

Actual result:

- `python3 -m compileall -q backend/src backend/tests`: passed.
- `pytest backend/tests`: 4 passed, 1 warning about `asyncio_mode` because `pytest-asyncio` was not installed in the ambient Python environment.
- `ruff check backend/src backend/tests`: passed.
- `npm install`: passed and generated `frontend/package-lock.json`.
- `npm run typecheck`: passed.
- `npm run build`: passed with escalated sandbox permissions because Next 16 Turbopack workers require local process/port capabilities blocked by the default sandbox.
- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities after upgrading to Next 16.2.9 and overriding PostCSS to the patched range.
- After adding integration docs/examples, `python3 -m compileall -q backend/src backend/tests examples/fastapi examples/service-client` passed.
- After adding integration docs/examples, `pytest backend/tests` passed: 4 passed.

Not executed:

- Compose startup.
- Alembic migration against live PostgreSQL.
- Keycloak realm import verification.
- Integration, E2E and load tests.
