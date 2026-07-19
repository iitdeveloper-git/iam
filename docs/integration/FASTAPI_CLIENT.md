# FastAPI Client Integration

Use this pattern when a FastAPI service accepts user tokens from IITD IAM.

## Environment Variables

```bash
IAM_ISSUER=https://iitdeveloper-keycloak.hf.space/realms/iitd
IAM_AUDIENCE=gns
IAM_JWKS_URL=https://iitdeveloper-keycloak.hf.space/realms/iitd/protocol/openid-connect/certs
```

## Token Verification Example

```python
from functools import lru_cache

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from jose import jwt

ISSUER = "https://iitdeveloper-keycloak.hf.space/realms/iitd"
AUDIENCE = "gns"
JWKS_URL = f"{ISSUER}/protocol/openid-connect/certs"


@lru_cache
def get_jwks():
    return httpx.get(JWKS_URL, timeout=5).json()


def current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = jwt.decode(
            token,
            get_jwks(),
            algorithms=["RS256"],
            issuer=ISSUER,
            audience=AUDIENCE,
            options={"verify_at_hash": False},
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="invalid token") from exc

    return {
        "identity_key": f"{claims['iss']}|{claims['sub']}",
        "email": claims.get("email"),
        "roles": claims.get("application_roles", []),
    }


app = FastAPI()


@app.get("/me")
def me(user=Depends(current_user)):
    return user
```

## Authorization

Do not authorize by frontend state. Enforce permissions in FastAPI dependencies.

```python
def require_role(role: str):
    def dependency(user=Depends(current_user)):
        if role not in user["roles"]:
            raise HTTPException(status_code=403, detail="forbidden")
        return user

    return dependency
```

