# Next.js Client Integration

Use this pattern when a Next.js application logs users in through IITD IAM.

## Recommended Library

Use Auth.js or another maintained OIDC client. Do not write Authorization Code Flow by hand unless you are maintaining a security-reviewed auth library.

## Environment Variables

```bash
AUTH_SECRET=replace-with-random-secret
AUTH_IITD_ISSUER=https://iitdeveloper-keycloak.hf.space/realms/iitd
AUTH_IITD_CLIENT_ID=your-client-id
AUTH_IITD_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=https://app.example.com
```

## Auth.js Provider Shape

```ts
import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "iitd-iam",
      name: "IITD IAM",
      type: "oidc",
      issuer: process.env.AUTH_IITD_ISSUER,
      clientId: process.env.AUTH_IITD_CLIENT_ID,
      clientSecret: process.env.AUTH_IITD_CLIENT_SECRET
    }
  ],
  session: {
    strategy: "jwt"
  }
});
```

## Redirect URI

Register this exact redirect URI in IAM:

```text
https://app.example.com/api/auth/callback/iitd-iam
```

For local development:

```text
http://localhost:3030/api/auth/callback/iitd-iam
```

## Server-Side Authorization

Use `auth()` in server components, route handlers or middleware. Protect data access on the server, not only in React components.

