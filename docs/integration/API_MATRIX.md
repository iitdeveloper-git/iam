# IAM API Matrix

This matrix tracks the intended V1 API surface and current implementation state.

| Area | Endpoint | Current status |
| --- | --- | --- |
| Current user | `GET /api/v1/me` | Implemented foundation |
| Users | `GET /api/v1/users` | Implemented foundation |
| Users | `POST /api/v1/users` | Implemented foundation |
| Users | `GET /api/v1/users/{user_id}` | Implemented foundation |
| Users | `POST /api/v1/users/{user_id}/suspend` | Implemented foundation |
| Applications | `GET /api/v1/applications` | Implemented foundation |
| Applications | `POST /api/v1/applications` | Implemented foundation |
| Applications | `GET /api/v1/applications/{application_id}` | Implemented foundation |
| Environments | `POST /api/v1/applications/{application_id}/environments` | Implemented foundation |
| Redirect URIs | `POST /api/v1/clients/{environment_id}/redirect-uris` | Implemented foundation |
| Application access | `POST /api/v1/applications/{application_id}/users` | Implemented foundation |
| Role assignment | `POST /api/v1/users/{user_id}/role-assignments` | Implemented foundation |
| Invitations | `GET /api/v1/invitations` | Implemented foundation |
| Invitations | `POST /api/v1/invitations` | Implemented foundation |
| Audit | `GET /api/v1/audit-events` | Implemented foundation |
| OAuth clients | Full client CRUD and rotate secret endpoints | Planned |
| Service accounts | Full service-account CRUD and rotate secret endpoints | Planned |
| Security settings | Security settings and session revocation endpoints | Planned |
| Invitation acceptance | Accept/resend/revoke endpoints | Planned |
| User self-service | Profile, sessions and logout-all endpoints | Planned |

`Implemented foundation` means the route exists and captures the first business rule shape. It does not mean the endpoint is production-complete.

## Authentication Status

The deployed API now supports real OIDC bearer token verification against the configured issuer JWKS.

The Netlify UI can send bearer tokens through the admin console session panel. Full automatic OIDC login in the admin UI remains planned.
