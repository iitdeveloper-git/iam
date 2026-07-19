import NextAuth, { customFetch } from "next-auth";

const TOKEN_EXPIRY_SKEW_SECONDS = 30;
const DEFAULT_IITD_ISSUER = "https://iitdeveloper-keycloak.hf.space/realms/iitd";
const DEFAULT_IITD_CLIENT_ID = "iitd-iam-admin";

function normalizeIssuer(value?: string) {
  return value?.replace(/\/+$/, "");
}

const publicIssuer = normalizeIssuer(process.env.AUTH_IITD_PUBLIC_ISSUER ?? process.env.AUTH_IITD_ISSUER) ?? DEFAULT_IITD_ISSUER;
const internalIssuer = normalizeIssuer(process.env.AUTH_IITD_ISSUER);
const clientId = process.env.AUTH_IITD_CLIENT_ID ?? DEFAULT_IITD_CLIENT_ID;

function isLoopbackIssuer(value?: string) {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

function shouldRewriteIssuer(url: string) {
  return Boolean(
    internalIssuer &&
      internalIssuer !== publicIssuer &&
      !isLoopbackIssuer(internalIssuer) &&
      url.startsWith(publicIssuer)
  );
}

function isExpired(expiresAt?: unknown) {
  return typeof expiresAt === "number" && expiresAt <= Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SKEW_SECONDS;
}

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

  if (shouldRewriteIssuer(urlStr) && internalIssuer) {
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
      issuer: publicIssuer,
      [customFetch]: customFetchInterceptor,
      // Keep the public issuer canonical for browser redirects and token issuer validation.
      // The custom fetch hook can still rewrite to an internal non-loopback URL for Docker.
      authorization: {
        url: `${publicIssuer}/protocol/openid-connect/auth`,
        params: { scope: "openid profile email" }
      },
      checks: ["pkce", "state"],
      clientId,
      ...(process.env.AUTH_IITD_CLIENT_SECRET
        ? { clientSecret: process.env.AUTH_IITD_CLIENT_SECRET }
        : { client: { token_endpoint_auth_method: "none" } }),
    }
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;
      }
      if (isExpired(token.expiresAt)) {
        delete token.accessToken;
        delete token.idToken;
        delete token.expiresAt;
      }
      return token;
    },
    session({ session, token }) {
      if (!isExpired(token.expiresAt)) {
        session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
        session.idToken = typeof token.idToken === "string" ? token.idToken : undefined;
        session.expiresAt = typeof token.expiresAt === "number" ? token.expiresAt : undefined;
      }
      return session;
    }
  }
});
