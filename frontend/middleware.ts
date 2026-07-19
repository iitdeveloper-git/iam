import { NextResponse } from "next/server";
import { auth } from "./auth";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasAccessToken = typeof request.auth?.accessToken === "string" && request.auth.accessToken.length > 0;

  if (isPublicPath || hasAccessToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
