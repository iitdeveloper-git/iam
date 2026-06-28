# Keycloak Integration

The `iitd_iam.integrations.keycloak` package separates HTTP administration from token verification. Admin operations must use server-side service-account credentials only. Browser code never receives Keycloak admin credentials.

The local Compose setup imports `docker/keycloak/realm-iitd.json` and mounts the IITD theme.

