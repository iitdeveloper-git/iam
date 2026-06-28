# React SPA Client Integration

Use this pattern only for public clients that cannot keep a client secret.

## Requirements

- Authorization Code Flow with PKCE.
- Exact redirect URI.
- Exact web origin.
- No implicit flow.
- No client secret in the browser.

## Recommended Libraries

Use a maintained OIDC client such as:

- `oidc-client-ts`
- A framework-specific wrapper around `oidc-client-ts`

## Local Configuration

```ts
export const oidcConfig = {
  authority: "http://localhost:8080/realms/iitd",
  client_id: "my-spa",
  redirect_uri: "http://localhost:3030/callback",
  post_logout_redirect_uri: "http://localhost:3030",
  response_type: "code",
  scope: "openid profile email"
};
```

## API Calls

Send access tokens only to APIs that validate issuer, audience, signature and expiry.

```ts
await fetch("https://api.example.com/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
```

Avoid storing tokens in localStorage when a backend-for-frontend session is possible.

