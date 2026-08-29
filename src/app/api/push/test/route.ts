import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser, platformOf } from "@/lib/webpush";

/**
 * What this account's notifications actually look like from the server's side,
 * and a way to fire one on demand.
 *
 * This exists because every failure in this pipeline was silent: a device that
 * never registered and a push that was rejected looked identical from the app.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subs = await prisma.pushSubscription.findMany({ orderBy: { createdAt: "asc" } });

  return NextResponse.json({
    user,
    configured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY,
    devices: subs.map((s) => ({
      id: s.id,
      mine: s.userId === user,
      who: s.userId,
      platform: platformOf(s.endpoint),
      since: s.createdAt,
    })),
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await sendPushToUser(user, {
    title: "It works",
    body: "This is a test notification. If you can read it, you're set up.",
    url: "/shelf",
  });

  return NextResponse.json({
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    // The real per-device outcome, including the push service's own message.
    results,
  });
}
