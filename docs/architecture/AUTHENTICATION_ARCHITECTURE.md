# Authentication Architecture

Browser and product authentication uses Keycloak OIDC Authorization Code Flow with PKCE. IAM API token verification validates issuer, audience, signature, expiry, issued-at, not-before where present and approved algorithms. Local development may use explicit dev headers only when configured and never in production.

