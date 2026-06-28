import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    {
      id: "iitd-iam",
      name: "IITD IAM",
      type: "oidc",
      issuer: process.env.AUTH_IITD_ISSUER,
      clientId: process.env.AUTH_IITD_CLIENT_ID,
      clientSecret: process.env.AUTH_IITD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email"
        }
      }
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

