# OIDC Verification Evidence

Status: `PARTIAL`

Last updated: 2026-07-20

## Local Evidence

The backend validates signed JWTs with issuer, audience and expiration checks.

Latest local command:

```bash
pytest backend/tests/test_token_verifier.py backend/tests/test_token_claims.py
```

Latest result:

```text
6 passed
```

Covered locally:

- valid RS256 token accepted
- wrong issuer rejected
- wrong audience rejected
- expired token rejected
- roles and permissions extracted from token claims

## Required Live Evidence Before DONE

Live OIDC discovery and protected-resource behavior have been verified. Full live browser-issued token verification remains pending because automated browser login was not available in this workspace and Keycloak direct password grant is intentionally disabled for the admin client.

Live evidence captured:

```text
Issuer:
https://iitdeveloper-keycloak.hf.space/realms/iitd

Discovery URL:
https://iitdeveloper-keycloak.hf.space/realms/iitd/.well-known/openid-configuration

Discovery result:
200

JWKS URL:
https://iitdeveloper-keycloak.hf.space/realms/iitd/protocol/openid-connect/certs

IAM readiness:
https://iitdeveloper-iam.hf.space/health/ready
200
api/postgres/redis/keycloak = ok

Protected API without token:
https://iitdeveloper-iam.hf.space/api/v1/applications
401 Authentication is required

Direct password grant:
disabled for client iitd-iam-admin
error = unauthorized_client
```

Required live test:

```text
User authenticates in Keycloak
→ receives access token
→ calls IITD IAM
→ IITD IAM verifies token
→ /api/v1/me returns the correct user
```

Required values to record:

```text
Issuer:
Audience:
Realm:
Client:
JWKS URL:
Token algorithm:
Token kid:
Test command:
Result:
Timestamp:
```
