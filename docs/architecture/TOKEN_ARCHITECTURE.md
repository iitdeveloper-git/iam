# Token Architecture

Tokens use standard OIDC claims: `iss`, `sub`, `aud`, `exp`, `iat`, `nbf` where present, `azp` where required, `typ` and `kid`. Product-specific tenant or institution memberships must not be embedded in central IAM tokens.

