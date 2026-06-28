# Functional Requirements

## Users

The platform stores a local projection of Keycloak users and never treats email as the immutable identity. Users have lifecycle states: invited, active, suspended, disabled and deleted.

## Applications

Administrators can register applications with one of four authorization modes: authentication-only, application-access, direct-roles or product-managed.

## Access

IAM can grant or revoke application access. For direct-role applications, IAM manages application roles and permissions. Product-specific authorization remains external.

## Invitations

Invitations are single-use, expiring and stored by token hash. Plaintext invitation tokens are returned only at creation time in the local implementation and must be delivered through an approved email provider in production.

## Audit

Administrative and security-relevant events are projected into audit records without secrets, passwords or tokens.

