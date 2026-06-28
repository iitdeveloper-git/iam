# Token Architecture

Tokens use standard OIDC claims: `iss`, `sub`, `aud`, `exp`, `iat`, `nbf` where present, `azp` where required, `typ` and `kid`. Product-specific tenant or institution memberships must not be embedded in central IAM tokens.

## Client Validation Contract

Every consuming backend must validate:

- Token signature against JWKS.
- `iss` equals the configured issuer.
- `aud` includes the application audience.
- `exp` is in the future.
- `iat` is reasonable.
- `nbf` is not in the future when present.
- Signing algorithm is approved.

Every product should store `iss` plus `sub` as the immutable identity key.
