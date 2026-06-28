# Client Integration Guide

This guide explains how IITDEVELOPER products and customer applications use IITD IAM from their own server, web app, SPA or backend service.

## What IITD IAM Provides

IITD IAM provides a central identity and access layer:

- Login through Keycloak using OpenID Connect.
- Application registration and environment-specific OAuth clients.
- Exact redirect URI and web-origin allowlists.
- Optional application access grants.
- Optional direct application roles and permissions.
- Machine-to-machine clients through OAuth 2.0 Client Credentials Flow.
- Developer integration settings: issuer, authorization endpoint, token endpoint, JWKS URL, logout endpoint, audience and client ID.

## What Your Application Still Owns

Your application still owns product-specific authorization and business data.

Examples:

- GNS owns tenants, memberships and product permissions.
- School ERP owns school, branch, teacher, parent, student and staff relationships.
- College ERP owns college, department, faculty and student relationships.
- Hospital platforms own hospital, patient, staff and clinical workflows.
- NeuroTrade owns subscriptions, broker links, portfolios and feature access.

Do not put school, college, hospital, department, tenant or portfolio memberships into central IAM tokens.

## Integration Patterns

### Pattern A: Authentication Only

Use this when your app only needs central login.

Flow:

1. User opens your app.
2. Your app redirects the user to the Keycloak authorization endpoint.
3. Keycloak authenticates the user.
4. Keycloak redirects back to your app with an authorization code.
5. Your app exchanges the code for tokens using PKCE.
6. Your app validates the ID/access token.
7. Your app creates its own secure session.
8. Your app resolves authorization from its own database.

### Pattern B: Application Access

Use this when IAM decides whether a user can open your app at all.

Flow:

1. Your app completes OIDC login.
2. Your backend validates the token.
3. Your backend checks an IAM-provided claim or calls the IAM API to confirm the user has access to your application.
4. If access is active, your app creates a session.
5. Detailed authorization remains inside your app.

### Pattern C: Direct Application Roles

Use this for simple apps that do not need tenant or organization hierarchy.

Flow:

1. Your app completes OIDC login.
2. Your backend validates the token.
3. Your backend reads `application_roles` or calls IAM to resolve roles and permissions.
4. Your app enforces those permissions server-side.

## Environment Setup

Each product should have separate clients for:

- `development`
- `staging`
- `production`

Never reuse production secrets in development.

For each environment, configure:

- Application key, for example `gns`.
- Issuer URL, for example `https://auth.iitdeveloper.com/realms/iitd`.
- Audience, for example `gns`.
- Client ID, for example `gns-web`.
- Client type: `public`, `confidential` or `machine`.
- Redirect URIs.
- Post-logout redirect URIs.
- Web origins.

## Standard OIDC Endpoints

For local development:

```text
Issuer:
http://localhost:8080/realms/iitd

Authorization endpoint:
http://localhost:8080/realms/iitd/protocol/openid-connect/auth

Token endpoint:
http://localhost:8080/realms/iitd/protocol/openid-connect/token

JWKS endpoint:
http://localhost:8080/realms/iitd/protocol/openid-connect/certs

Logout endpoint:
http://localhost:8080/realms/iitd/protocol/openid-connect/logout
```

For production, replace the host with the production auth domain:

```text
https://auth.iitdeveloper.com/realms/iitd
```

## Required Token Validation

Every backend that accepts IITD IAM tokens must validate:

- Signature against JWKS.
- `iss`.
- `aud`.
- `sub`.
- `exp`.
- `iat`.
- `nbf` when present.
- Approved signing algorithm, normally `RS256`.
- `azp` where required.

Never trust tokens only because they can be decoded. Decoding is not validation.

## Token Claims

Typical token claims:

```json
{
  "iss": "https://auth.iitdeveloper.com/realms/iitd",
  "sub": "immutable-keycloak-user-id",
  "aud": "gns",
  "azp": "gns-web",
  "email": "user@example.com",
  "email_verified": true,
  "preferred_username": "user@example.com",
  "application_access": ["gns"],
  "application_roles": ["viewer"]
}
```

Use `sub` plus `iss` as the identity key. Do not use email as the immutable user key.

## Server-Side Session Recommendation

For web apps, create your own secure server-side session after OIDC login.

Cookies should be:

- `HttpOnly`
- `Secure` in production
- `SameSite=Lax` or stricter
- Short-lived with refresh strategy

Do not store access tokens in localStorage for confidential applications.

## Redirect URI Rules

IITD IAM requires exact redirect URI matching.

Allowed local example:

```text
http://localhost:3030/api/auth/callback/iam
```

Allowed production example:

```text
https://app.example.com/api/auth/callback/iam
```

Rejected:

```text
https://*.example.com/callback
http://app.example.com/callback
https://localhost:3030/callback
```

Production redirects must use HTTPS and must not use localhost.

## Machine-to-Machine Clients

Use Client Credentials Flow for backend services and workers.

Do not use human passwords for service-to-service authentication.

Service clients receive:

- Client ID.
- Client secret shown once.
- Token endpoint.
- Audience/scope.

Secrets must be stored in the consuming service secret manager.

## Integration Checklist

- [ ] Application is registered in IAM.
- [ ] Environment is created.
- [ ] Client type is correct.
- [ ] Redirect URIs are exact.
- [ ] Web origins are exact.
- [ ] Production redirects use HTTPS.
- [ ] Backend validates JWT signature and claims.
- [ ] Backend uses `iss` + `sub` as user identity.
- [ ] Backend enforces authorization server-side.
- [ ] Secrets are stored outside source code.
- [ ] Logout flow is implemented.
- [ ] Token refresh strategy is documented.

## Admin Console on Netlify

The admin console is a TypeScript Next.js application and can deploy on Netlify's free tier.

Configure these Netlify environment variables:

```text
AUTH_SECRET
AUTH_URL
AUTH_IITD_ISSUER
AUTH_IITD_CLIENT_ID
AUTH_IITD_CLIENT_SECRET
NEXT_PUBLIC_IAM_API_URL
```

Register this callback URI in Keycloak/IAM:

```text
https://your-netlify-site.netlify.app/api/auth/callback/iitd-iam
```

Fallback deployable bridge mode:

1. Configure `NEXT_PUBLIC_IAM_API_URL` in Netlify to the Hugging Face API base URL, for example:

   ```text
   https://iitdeveloper-iam.hf.space/api/v1
   ```

2. Obtain an OIDC access token from the configured Keycloak realm.
3. Paste the access token into the admin console session panel.
4. The UI sends API calls with:

   ```text
   Authorization: Bearer <access-token>
   ```

This fallback is useful for UAT while OIDC client secrets and callback URLs are being configured.
