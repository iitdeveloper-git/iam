# OIDC Verification Evidence

Status: `PARTIAL`

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

Live Keycloak verification has not yet been completed in this workspace.

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

