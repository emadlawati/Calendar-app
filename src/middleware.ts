import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_NAME, SESSION_MAX_AGE_SECONDS, getSecretKey, signSessionToken } from "@/lib/session";
import type { SessionPayload } from "@/lib/session";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/cron",
  "/birthday",
  "/birthday/",
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/icons/",
];

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_NAME);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Allow GET requests to /api/events/action (email accept links)
  const isEmailAccept =
    request.method === "GET" && pathname.startsWith("/api/events/action");

  // A cookie can be present but expired/corrupt — verify it, don't just check presence
  let isValidSession = false;
  let sessionPayload: SessionPayload | null = null;
  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify<SessionPayload>(sessionCookie.value, getSecretKey());
      // Sessions minted before tenancy carry no coupleId. There is no safe
      // way to guess which couple they belong to, so treat them as expired
      // and make the user sign in again.
      if (payload.coupleId) {
        isValidSession = true;
        sessionPayload = {
          userId: payload.userId,
          email: payload.email,
          coupleId: payload.coupleId,
        };
      }
    } catch {
      isValidSession = false;
    }
  }

  if (!isValidSession && !isPublic && !isEmailAccept) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isValidSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();

  // Sliding session: every authenticated request reissues a fresh token
  // (new exp, not just a new cookie maxAge) so staying active never logs
  // you out — only true inactivity for the whole window does.
  if (isValidSession && sessionPayload) {
    const freshToken = await signSessionToken(sessionPayload);
    response.cookies.set(SESSION_NAME, freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|birthday/).*)",
  ],
};
