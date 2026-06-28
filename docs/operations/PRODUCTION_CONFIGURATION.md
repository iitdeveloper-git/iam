# Production Configuration

IITD IAM must fail startup or deployment validation when unsafe production settings are present.

## Required Backend Environment

Use the `IAM_` prefix for backend settings.

```text
IAM_ENVIRONMENT=production
IAM_DATABASE_URL=postgresql://...
IAM_REDIS_URL=redis://...
IAM_KEYCLOAK_BASE_URL=https://auth.iitdeveloper.com
IAM_KEYCLOAK_REALM=iitd
IAM_KEYCLOAK_ADMIN_CLIENT_ID=...
IAM_KEYCLOAK_ADMIN_CLIENT_SECRET=...
IAM_OIDC_ISSUER=https://auth.iitdeveloper.com/realms/iitd
IAM_OIDC_JWKS_URL=https://auth.iitdeveloper.com/realms/iitd/protocol/openid-connect/certs
IAM_OIDC_AUDIENCE=iitd-iam-admin
IAM_CORS_ORIGINS=["https://iam.iitdeveloper.com"]
IAM_ALLOWED_REDIRECT_URLS=["https://iam.iitdeveloper.com/api/auth/callback/iitd-iam"]
IAM_COOKIE_SECURE=true
IAM_ALLOW_DEV_AUTH=false
IAM_ALLOW_UAT_BEARER_TOKEN_FALLBACK=false
IAM_DEBUG=false
```

## Production Rejection Rules

Production configuration is rejected when:

- PostgreSQL is not used.
- OIDC JWKS URL is missing.
- OIDC issuer or JWKS URL uses HTTP.
- Development authentication is enabled.
- UAT bearer-token fallback is enabled.
- Debug mode is enabled.
- Secure cookies are disabled.
- CORS contains `*`.
- CORS origins are not HTTPS.
- Redirect URLs are not HTTPS.
- OIDC algorithms include `none` or symmetric algorithms such as `HS256`.
- Keycloak admin secrets appear to be placeholders.

These checks are covered by `backend/tests/test_production_config.py`.

## Netlify Admin UI

Required Netlify variables:

```text
AUTH_SECRET
AUTH_URL
AUTH_IITD_ISSUER
AUTH_IITD_CLIENT_ID
AUTH_IITD_CLIENT_SECRET
NEXT_PUBLIC_IAM_API_URL
NEXT_PUBLIC_ENABLE_UAT_TOKEN_FALLBACK=false
```

Register this callback in Keycloak:

```text
https://<netlify-site>/api/auth/callback/iitd-iam
```

The bearer-token fallback must remain disabled outside UAT.

## Hugging Face API

The Hugging Face Space must receive production runtime secrets through Space secrets, not source files.

Required:

```text
IAM_DATABASE_URL
IAM_REDIS_URL
IAM_KEYCLOAK_BASE_URL
IAM_OIDC_ISSUER
IAM_OIDC_JWKS_URL
IAM_OIDC_AUDIENCE
IAM_COOKIE_SECURE=true
IAM_ENVIRONMENT=production
```

## Release Gate

Production configuration can be marked `DONE` only after:

1. Automated settings tests pass.
2. Hugging Face runtime env is independently verified.
3. Netlify runtime env is independently verified.
4. Live OIDC login and token validation pass.
5. `/health/ready` confirms PostgreSQL, Redis and Keycloak.

