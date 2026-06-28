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

## GitHub Deployments

Backend deploys to Hugging Face with `.github/workflows/deploy-backend-huggingface.yaml`.

Required GitHub settings:

- Secret: `HF_TOKEN`
- Optional variable or secret: `HF_SPACE_ID`; defaults to `iitdeveloper/iam`

The Hugging Face Space must have runtime secrets for `IAM_DATABASE_URL`, `IAM_REDIS_URL`, `IAM_KEYCLOAK_BASE_URL`, `IAM_OIDC_ISSUER` and `IAM_OIDC_AUDIENCE`.

Frontend deploys to Netlify with `.github/workflows/deploy-frontend-netlify.yaml`.

Required GitHub settings:

- Secret: `NETLIFY_AUTH_TOKEN`
- Secret: `NETLIFY_SITE_ID`
- Variable: `NEXT_PUBLIC_IAM_API_URL`
