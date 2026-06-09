import NextAuth from "next-auth";
import type { NextRequest } from "next/server";

import { authConfig } from "@/lib/auth/auth.config";

export const { auth } = NextAuth(authConfig);

/**
 * Auth.js rewrites `req.nextUrl` to `NEXTAUTH_URL` (reqWithEnvURL). For redirects
 * use the incoming Host so dev on alternate ports (e.g. 3010) stays on that origin.
 */
function getRequestOrigin(req: NextRequest): string {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");

  if (host) {
    const protocol =
      req.headers.get("x-forwarded-proto") ??
      (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return req.nextUrl.origin;
}

export default auth((req) => {
  const { nextUrl } = req;
  const requestOrigin = getRequestOrigin(req);
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!req.auth;

  const protectedPrefixes = [
    "/dashboard",
    "/companies",
    "/jobs",
    "/settings",
    "/users",
    "/onboarding",
  ];

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", requestOrigin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL("/dashboard", requestOrigin));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
