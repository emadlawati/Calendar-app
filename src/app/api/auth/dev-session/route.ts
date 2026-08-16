import { NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import type { User } from "@/lib/types";

/**
 * DEV-ONLY sign-in shortcut: /api/auth/dev-session?as=Wife
 * Google OAuth is a hassle when testing locally — this mints a real session
 * cookie so the app can be exercised end-to-end. Hard-gated to development;
 * production builds return 404 without touching the session.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const as = searchParams.get("as") === "Husband" ? "Husband" : "Wife";
  await createSession({ userId: as as User, email: `dev-${as.toLowerCase()}@localhost` });

  return NextResponse.redirect(new URL("/", request.url));
}
