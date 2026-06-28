from jose import jwt

from iitd_iam.config import Settings


class TokenVerifier:
    def __init__(self, settings: Settings, jwks: dict):
        self.settings = settings
        self.jwks = jwks

    def verify(self, token: str) -> dict:
        return jwt.decode(
            token,
            self.jwks,
            algorithms=self.settings.oidc_algorithms,
            audience=self.settings.oidc_audience,
            issuer=str(self.settings.oidc_issuer),
            options={"verify_at_hash": False},
        )

