# User Flows

## Application Onboarding

Platform admin creates an application, creates an environment, registers a client, adds exact redirect URIs, assigns an application admin, tests OIDC login and promotes configuration across environments.

## Invitation

Admin creates an invitation. IAM hashes the token, creates or locates the Keycloak identity, sends a required-action email through Keycloak or GNS, activates access after successful acceptance and writes audit history.

## Suspension

Security admin suspends a user. IAM marks the user suspended, calls Keycloak session revocation and denies future IAM API access.

