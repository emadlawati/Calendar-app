import { NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { systemPrisma } from "@/lib/prisma";
import type { User } from "@/lib/types";

/**
 * DEV-ONLY sign-in shortcut: /api/auth/dev-session?as=Wife[&couple=<id>]
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

  // A session is meaningless without a couple. Use the one asked for, else
  // fall back to the oldest — which is the developer's own.
  const requested = searchParams.get("couple");
  const couple = requested
    ? await systemPrisma.couple.findUnique({ where: { id: requested } })
    : await systemPrisma.couple.findFirst({ orderBy: { createdAt: "asc" } });

  if (!couple) {
    return NextResponse.json({ error: "No couple exists to sign in as" }, { status: 400 });
  }

  const member = await systemPrisma.coupleUser.findFirst({
    where: { coupleId: couple.id, role: as },
  });

  await createSession({
    userId: as as User,
    email: member?.email || `dev-${as.toLowerCase()}@localhost`,
    coupleId: couple.id,
  });

  return NextResponse.redirect(new URL("/", request.url));
}
