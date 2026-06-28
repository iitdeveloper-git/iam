# Live UAT Evidence

Status: `PARTIAL`

Known live evidence:

- Hugging Face `/docs` endpoint was reachable in a prior check.
- Hugging Face `/health/live` endpoint was reachable in a prior check.

Not yet verified after latest `uat` commits:

- Latest `uat` backend deployed.
- Netlify UI deployed from `uat`.
- Auth.js callback works.
- Real Keycloak login works.
- `/api/v1/me` accepts a real Keycloak token.
- `/health/ready` confirms PostgreSQL, Redis and Keycloak.

Required evidence:

```text
Frontend URL:
Backend URL:
Keycloak issuer:
Admin login test result:
Token verification test result:
Readiness result:
Timestamp:
```

