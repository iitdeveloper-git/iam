# API Design

The API is versioned under `/api/v1` and returns stable error envelopes. Backend authorization dependencies enforce permissions server-side. OpenAPI is available at `/api/openapi.json`.

## Error Envelope

All API errors use this shape:

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "The principal lacks the required permission.",
    "request_id": "req_123",
    "details": []
  }
}
```

Clients should branch on `error.code`, not on message text.

## Authentication

Production API requests must use verified OIDC bearer tokens. Local development may use `X-Dev-User` and `X-Dev-Roles` only when `IAM_ALLOW_DEV_AUTH=true`.

## Authorization

Backend permission checks are authoritative. UI navigation checks are only a convenience.

## Pagination

List endpoints should standardize on:

```text
limit
offset
sort
filter
```

The current implementation has foundational list routes and must be expanded before production.

## API Surface Status

See [API_MATRIX.md](/Users/ravi/Documents/projects/ett/iam/docs/integration/API_MATRIX.md).
