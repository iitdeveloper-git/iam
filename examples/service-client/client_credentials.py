import os

import httpx


def fetch_service_token() -> str:
    response = httpx.post(
        "https://auth.iitdeveloper.com/realms/iitd/protocol/openid-connect/token",
        data={
            "grant_type": "client_credentials",
            "client_id": os.environ["IAM_CLIENT_ID"],
            "client_secret": os.environ["IAM_CLIENT_SECRET"],
            "scope": "openid",
        },
        timeout=10,
    )
    response.raise_for_status()
    return response.json()["access_token"]

