# Machine-to-Machine Integration

Use Client Credentials Flow for backend services, workers and internal integrations.

## Configuration

The service receives:

- Token endpoint.
- Client ID.
- Client secret shown once.
- Audience or scope.

## Token Request

```bash
curl -s \
  -X POST "https://auth.iitdeveloper.com/realms/iitd/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=gns-worker" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "scope=openid"
```

## Python Example

```python
import httpx


def fetch_service_token():
    response = httpx.post(
        "https://auth.iitdeveloper.com/realms/iitd/protocol/openid-connect/token",
        data={
            "grant_type": "client_credentials",
            "client_id": "gns-worker",
            "client_secret": "...",
            "scope": "openid",
        },
        timeout=10,
    )
    response.raise_for_status()
    return response.json()["access_token"]
```

## Security Rules

- Store client secrets in a secret manager.
- Rotate secrets regularly.
- Do not use service clients in browsers.
- Grant the smallest required scope.
- Audit service access.

