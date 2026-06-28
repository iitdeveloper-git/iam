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

