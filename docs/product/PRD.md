# IITD IAM PRD

## Summary

IITD IAM provides central identity administration for IITDEVELOPER products while delegating standards-compliant authentication and token issuance to Keycloak.

## Goals

- Provide a branded IAM admin console.
- Manage applications, environments, OAuth clients, redirect URIs, roles, permissions, users, invitations, access grants, service accounts and audit events.
- Support authentication-only, application-access, direct-role and product-managed authorization patterns.
- Keep product-specific tenant, school, college, hospital and portfolio authorization inside each product.

## Non-Goals

- Custom OAuth, OIDC, SAML, WebAuthn, MFA or password hashing implementations.
- Product-specific hierarchy modeling in V1.
- Production deployment without DNS, TLS, SMTP/GNS, cloud and secret-manager credentials.

## V1 Status

Implemented in this repository: local foundation, schema, migrations, API route foundation, Keycloak realm import, admin UI pages, CI, docs and security rules tests.

Remaining before production: full Keycloak admin orchestration, real OIDC session handling in the admin UI, end-to-end invitation acceptance, production secret manager integration, integration/E2E/load/security scans and live staging verification.

