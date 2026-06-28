# Local Development

Copy `.env.example` to `.env`, replace secrets, then run:

```bash
podman compose up -d postgres redis keycloak
podman compose --profile tools run --rm migrate
podman compose up -d
```

