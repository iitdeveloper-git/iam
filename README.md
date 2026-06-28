---
title: IITD IAM
emoji: 🔐
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# IITD IAM

IITD IAM is a central identity and access management platform for IITDEVELOPER products. This repository contains the V1 foundation: a FastAPI management API, PostgreSQL schema and migrations, Redis/Keycloak local runtime, a Next.js admin console, a Keycloak theme, documentation, CI, and resumable agent state.

Keycloak owns authentication protocols, sessions, passwords, MFA and token signing. IITD IAM owns application registry, access grants, role and permission administration, invitations, service accounts, audit projection and operational workflows.

## Local Start

```bash
cp .env.example .env
# Replace all placeholder secrets in .env.
podman compose up -d postgres redis keycloak
podman compose --profile tools run --rm migrate
podman compose up -d
```

Admin UI: http://localhost:3030  
API: http://localhost:8000  
Keycloak: http://localhost:8080

The local API supports development headers only when `IAM_ALLOW_DEV_AUTH=true`. Production configuration rejects development authentication and requires PostgreSQL.

## Verification

```bash
cd backend
pip install -e ".[test]"
pytest
```

Frontend verification requires Node dependencies:

```bash
cd frontend
npm install
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

`next build` may require broader local process permissions in restricted sandboxes because Next 16 uses Turbopack workers.

## How Client Apps Use IITD IAM

Client applications integrate through OpenID Connect, not by calling private Keycloak admin APIs.

Start with:

- [Client Integration Guide](/Users/ravi/Documents/projects/ett/iam/docs/integration/CLIENT_INTEGRATION_GUIDE.md)
- [FastAPI Client](/Users/ravi/Documents/projects/ett/iam/docs/integration/FASTAPI_CLIENT.md)
- [Next.js Client](/Users/ravi/Documents/projects/ett/iam/docs/integration/NEXTJS_CLIENT.md)
- [React SPA Client](/Users/ravi/Documents/projects/ett/iam/docs/integration/REACT_SPA_CLIENT.md)
- [Machine-to-Machine](/Users/ravi/Documents/projects/ett/iam/docs/integration/MACHINE_TO_MACHINE.md)
- [GNS Integration](/Users/ravi/Documents/projects/ett/iam/docs/integration/GNS_INTEGRATION.md)

The Netlify admin UI is a TypeScript Next.js app. In the current deployable bridge mode, paste a Keycloak/OIDC access token into the UI session panel; the UI sends API calls with `Authorization: Bearer <token>`.

## GitHub Deployments

Backend deploys to Hugging Face with `.github/workflows/deploy-prod.yml`.

Required GitHub settings:

- Secret: `HF_TOKEN`

The Hugging Face Space must have runtime secrets for `IAM_DATABASE_URL`, `IAM_REDIS_URL`, `IAM_KEYCLOAK_BASE_URL`, `IAM_OIDC_ISSUER` and `IAM_OIDC_AUDIENCE`.
