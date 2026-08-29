import { NextResponse } from "next/server";
import prisma, { systemPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { platformOf } from "@/lib/webpush";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const user = await getCurrentUser();
    if (!session || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint, keys } = await request.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // `endpoint` is globally unique — one browser, one subscription — so a
    // phone that was registered under a different family (or by the other
    // partner) already owns this row. The tenancy extension does not scope an
    // upsert's `where`, so clear the old row explicitly rather than writing
    // across the boundary.
    await systemPrisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        NOT: { coupleId: session.coupleId, userId: user },
      },
    });

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user, keys: JSON.stringify(keys) },
      create: { userId: user, endpoint, keys: JSON.stringify(keys) },
    });

    console.log(`[push] registered ${platformOf(endpoint)} for ${user}`);
    return NextResponse.json({ success: true, platform: platformOf(endpoint) });
  } catch (error) {
    console.error("[push] subscribe failed:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json();
    if (endpoint) {
      // Scoped by the extension, so this only ever removes your own family's.
      await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
