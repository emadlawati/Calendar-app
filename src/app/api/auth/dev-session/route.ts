import { NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { systemPrisma } from "@/lib/prisma";
import { redeemInvite } from "@/lib/invites";
import type { User } from "@/lib/types";

/**
 * DEV-ONLY sign-in shortcut.
 *
 *   /api/auth/dev-session?as=Wife[&couple=<id>]
 *   /api/auth/dev-session?invite=<token>&email=<address>
 *
 * Google OAuth is a hassle when testing locally — this mints a real session
 * cookie so the app can be exercised end-to-end. The invite form runs the
 * real redeemInvite, so registration can be tested without standing in for
 * Google; everything after the identity check is the same code the callback
 * runs. Hard-gated to development; production returns 404 without touching
 * the session.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);

  // Registration: redeem an invitation as if Google had just proved this
  // address, then hand back a session exactly as the callback would.
  const inviteToken = searchParams.get("invite");
  if (inviteToken) {
    const email = (searchParams.get("email") ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "email is required with invite" }, { status: 400 });
    }
    const redeemed = await redeemInvite(inviteToken, email);
    if ("error" in redeemed) {
      return NextResponse.json({ error: redeemed.error }, { status: 400 });
    }
    await createSession({
      userId: redeemed.role as User,
      email,
      coupleId: redeemed.coupleId,
    });
    return NextResponse.json({
      ok: true,
      coupleId: redeemed.coupleId,
      role: redeemed.role,
      next: "/welcome",
    });
  }

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
