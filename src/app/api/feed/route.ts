import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { randomBytes } from "node:crypto";
import { systemPrisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { parseWidgetConfig, BLOCK_IDS, type WidgetBlock } from "@/lib/widget-config";

/**
 * Managing your own calendar feed link.
 *
 * systemPrisma is right here: FeedToken is addressed by (coupleId, userId)
 * taken from the session, never by an id the caller supplies.
 */

const base = () => process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const feedUrl = (token: string) => `${base()}/api/feed/${token}.ics`;
const widgetUrl = (token: string) => `${base()}/api/widget/${token}.png`;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feed = await systemPrisma.feedToken.findFirst({
    where: { coupleId: session.coupleId, userId: session.userId },
  });

  return NextResponse.json(
    feed
      ? {
          exists: true,
          url: feedUrl(feed.token),
          widgetUrl: widgetUrl(feed.token),
          widget: parseWidgetConfig(feed.widgetConfig),
          lastUsedAt: feed.lastUsedAt,
          createdAt: feed.createdAt,
        }
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

  return NextResponse.json({
    exists: true,
    url: feedUrl(feed.token),
    widgetUrl: widgetUrl(feed.token),
    widget: parseWidgetConfig(feed.widgetConfig),
    createdAt: feed.createdAt,
  });
}

/** PATCH — what the widget shows. Never touches the token itself. */
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  // Round-trip through the parser so anything malformed becomes a default
  // rather than reaching the renderer.
  const config = parseWidgetConfig({
    blocks: Array.isArray(body.blocks)
      ? body.blocks.filter((b: unknown) => BLOCK_IDS.includes(b as WidgetBlock))
      : undefined,
    rows: body.rows,
    theme: body.theme,
  });

  const updated = await systemPrisma.feedToken.updateMany({
    where: { coupleId: session.coupleId, userId: session.userId },
    // Prisma's Json input wants an index signature; the shape is already
    // validated by parseWidgetConfig above.
    data: { widgetConfig: { ...config } },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "No feed link yet" }, { status: 404 });
  }

  return NextResponse.json({ widget: config });
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
