# GNS Live Integration Evidence

Status: `NOT_DONE`

GNS live integration has not yet been verified.

Required user flow:

```text
GNS redirects user to IITD IAM
→ user authenticates
→ IAM returns authorization code
→ GNS exchanges code with PKCE
→ GNS validates issuer and audience
→ GNS resolves user identity
→ GNS loads its own tenant membership
→ user accesses dashboard
→ logout works
→ session revocation blocks access
```

Required machine flow:

```text
GNS service client obtains client-credentials token
→ calls allowed IAM/integration endpoint
→ unauthorized scope is denied
```

