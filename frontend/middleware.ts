import { NextResponse } from "next/server";
import { auth } from "./auth";

const PUBLIC_PATHS = ["/login", "/api/auth"];
const TOKEN_EXPIRY_SKEW_SECONDS = 30;

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasAccessToken = typeof request.auth?.accessToken === "string" && request.auth.accessToken.length > 0;
  const expiresAt = request.auth?.expiresAt;
  const hasFreshAccessToken = hasAccessToken && (typeof expiresAt !== "number" || expiresAt > Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SKEW_SECONDS);

  if (isPublicPath || hasFreshAccessToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  loginUrl.searchParams.set("error", "authentication_required");
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
