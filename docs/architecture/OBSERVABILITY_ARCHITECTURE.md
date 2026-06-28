# Observability Architecture

The API exposes Prometheus metrics at `/metrics` and carries request IDs through responses. Structured logs and OpenTelemetry traces should include request and correlation IDs while excluding passwords, tokens, client secrets, authorization codes, MFA secrets and invitation tokens.

