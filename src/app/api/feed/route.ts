import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { randomBytes } from "node:crypto";
import { systemPrisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * Managing your own calendar feed link.
 *
 * systemPrisma is right here: FeedToken is addressed by (coupleId, userId)
 * taken from the session, never by an id the caller supplies.
 */

const feedUrl = (token: string) =>
  `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/feed/${token}.ics`;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feed = await systemPrisma.feedToken.findFirst({
    where: { coupleId: session.coupleId, userId: session.userId },
  });

  return NextResponse.json(
    feed
      ? { exists: true, url: feedUrl(feed.token), lastUsedAt: feed.lastUsedAt, createdAt: feed.createdAt }
      : { exists: false },
  );
}

/** Create the link, or replace it — which is also how you revoke the old one. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 32 bytes: this is the whole credential, so it should be unguessable on
  // its own rather than relying on anything around it.
  const token = randomBytes(32).toString("base64url");

  const feed = await systemPrisma.feedToken.upsert({
    where: { coupleId_userId: { coupleId: session.coupleId, userId: session.userId } },
    update: { token, lastUsedAt: null },
    create: { coupleId: session.coupleId, userId: session.userId, token },
  });

  return NextResponse.json({ exists: true, url: feedUrl(feed.token), createdAt: feed.createdAt });
}

/** Revoke: any device still subscribed simply stops updating. */
export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await systemPrisma.feedToken.deleteMany({
    where: { coupleId: session.coupleId, userId: session.userId },
  });

  return NextResponse.json({ exists: false });
}
