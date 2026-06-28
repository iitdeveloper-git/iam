# GNS Integration Guide

GNS should use IITD IAM for user login and optional application access. GNS should continue to own tenant membership, GNS roles, feature permissions and business authorization.

## Recommended Pattern

Use Pattern B: Application Access.

IITD IAM decides whether a user can access GNS. GNS decides what the user can do inside GNS.

## GNS Application Registration

Suggested values:

```text
Application key: gns
Application name: GNS
Authorization mode: application_access
Development client ID: gns-web-dev
Staging client ID: gns-web-staging
Production client ID: gns-web
Audience: gns
```

## Login Flow

1. User opens GNS.
2. GNS redirects to IITD IAM.
3. User authenticates through Keycloak.
4. GNS receives an authorization code.
5. GNS exchanges the code using PKCE.
6. GNS validates the token.
7. GNS confirms application access.
8. GNS creates its own session.
9. GNS loads tenant and role data from the GNS database.

## Identity Mapping

Store:

```text
identity_issuer
identity_subject
email
display_name
```

Use:

```text
identity_issuer + identity_subject
```

as the stable identity key.

Do not use email as the stable identity key.

