# System Context

IITD IAM sits between IITDEVELOPER administrators, product teams, product applications, and Keycloak. Client applications validate Keycloak-issued tokens locally and call IAM only for management, service account administration, or optional access-resolution APIs.

## Architecture Context Diagram

```mermaid
graph TD
    User([End User])
    Admin([System/Product Admin])
    
    subgraph Client Apps Area
        App[Product Client Application e.g., GNS]
    end
    
    subgraph IITD IAM Core
        IAM_API[FastAPI Management API]
        IAM_DB[(PostgreSQL Store)]
        Keycloak[Keycloak Identity Provider]
    end

    %% Interactions
    User -->|1. Authenticates via OIDC Code Flow| Keycloak
    User -->|2. Accesses application resources| App
    App -->|3. Validates Token Locally offline| Keycloak
    App -->|4. Checks roles/management| IAM_API
    
    Admin -->|Manages Apps, Roles, Invites| IAM_API
    IAM_API -->|Syncs Users / Validates clients| Keycloak
    IAM_API -->|Reads / Writes metadata| IAM_DB
```

## System Responsibilities

| System | Primary Responsibilities |
| :--- | :--- |
| **Keycloak** | Authentication protocols (OIDC, SAML), user credentials, session cookies, MFA, token generation and cryptographic signing. |
| **IITD IAM API** | Application registrations, tenant/access grants, invitation lifecycle management, audit logs, service account secrets, and platform-wide/application-scoped RBAC definitions. |
| **Product Applications (e.g., GNS)** | Custom internal permissions, local session management, and business logic enforcement. |
