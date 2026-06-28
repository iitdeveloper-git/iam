# Low-Level Design

The backend is organized around explicit domain models and route modules. Route handlers validate input and delegate security decisions to shared auth dependencies. Business rules such as redirect validation and privilege-escalation prevention live outside handlers and are unit-tested.

The database schema is normalized around users, applications, environments, redirect URIs, access grants, roles, permissions, invitations, service accounts, sessions and audit events.

Cross-system workflows must follow the provisioning consistency strategy in [CONSISTENCY_AND_PROVISIONING.md](/Users/ravi/Documents/projects/ett/iam/docs/architecture/CONSISTENCY_AND_PROVISIONING.md). IAM database writes and Keycloak Admin API calls cannot be treated as one atomic transaction.
