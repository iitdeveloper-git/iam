# Low-Level Design

The backend is organized around explicit domain models and route modules. Route handlers validate input and delegate security decisions to shared auth dependencies. Business rules such as redirect validation and privilege-escalation prevention live outside handlers and are unit-tested.

The database schema is normalized around users, applications, environments, redirect URIs, access grants, roles, permissions, invitations, service accounts, sessions and audit events.

