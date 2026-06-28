from functools import lru_cache

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from jose import jwt

ISSUER = "http://localhost:8080/realms/iitd"
AUDIENCE = "gns"
JWKS_URL = f"{ISSUER}/protocol/openid-connect/certs"


@lru_cache
def get_jwks():
    return httpx.get(JWKS_URL, timeout=5).json()


def current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    claims = jwt.decode(
        token,
        get_jwks(),
        algorithms=["RS256"],
        issuer=ISSUER,
        audience=AUDIENCE,
        options={"verify_at_hash": False},
    )
    return {"identity_key": f"{claims['iss']}|{claims['sub']}", "email": claims.get("email")}


app = FastAPI()


@app.get("/me")
def me(user=Depends(current_user)):
    return user

