import NextAuth, { customFetch } from "next-auth";

function customFetchInterceptor(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let urlStr = "";
  if (typeof input === "string") {
    urlStr = input;
  } else if (input instanceof URL) {
    urlStr = input.toString();
  } else if (input && typeof input === "object" && "url" in input) {
    urlStr = (input as any).url;
  } else {
    urlStr = String(input);
  }

  const publicIssuer = "http://localhost:8080";
  const internalIssuer = "http://keycloak:8080";

  if (urlStr.startsWith(publicIssuer)) {
    const rewrittenUrl = urlStr.replace(publicIssuer, internalIssuer);
    console.log(`[auth] customFetch: Rewriting request ${urlStr} -> ${rewrittenUrl}`);
    
    if (input instanceof Request) {
      const newRequest = new Request(rewrittenUrl, input);
      return fetch(newRequest, init);
    }
    return fetch(rewrittenUrl, init);
  }

  return fetch(input, init);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    {
      id: "iitd-iam",
      name: "IITD IAM",
      type: "oidc",
      issuer: process.env.AUTH_IITD_ISSUER,
      [customFetch]: customFetchInterceptor,
      // Use the public issuer URL for browser-facing redirects.
      // AUTH_IITD_ISSUER may be an internal Docker hostname (keycloak:8080),
      // AUTH_IITD_PUBLIC_ISSUER should be the browser-reachable URL (localhost:8080).
      authorization: {
        url: `${process.env.AUTH_IITD_PUBLIC_ISSUER ?? process.env.AUTH_IITD_ISSUER}/protocol/openid-connect/auth`,
        params: { scope: "openid profile email" }
      },
      checks: ["pkce", "state"],
      clientId: process.env.AUTH_IITD_CLIENT_ID,
      ...(process.env.AUTH_IITD_CLIENT_SECRET
        ? { clientSecret: process.env.AUTH_IITD_CLIENT_SECRET }
        : { client: { token_endpoint_auth_method: "none" } }),
    }
  ],
  callbacks: {
    jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.idToken = typeof token.idToken === "string" ? token.idToken : undefined;
      session.expiresAt = typeof token.expiresAt === "number" ? token.expiresAt : undefined;
      return session;
    }
  }
});
