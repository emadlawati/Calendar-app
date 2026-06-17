import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/cron",
  "/events/adjust",
  "/birthday",
  "/birthday/",
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/icons/",
];

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session");
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Allow GET requests to /api/events/action (email accept links)
  const isEmailAccept =
    request.method === "GET" && pathname.startsWith("/api/events/action");

  if (!session && !isPublic && !isEmailAccept) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|birthday/).*)",
  ],
};
