import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { randomBytes } from "node:crypto";
import { systemPrisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const INVITE_DAYS = 14;

/**
 * Who may hand out invitations to *new* couples.
 *
 * Deliberately not a public signup: only the founding couple (the oldest one
 * in the database — the people who set this up) can bring another couple in.
 * Anyone can invite their own missing partner.
 */
async function isFounder(coupleId: string): Promise<boolean> {
  const founding = await systemPrisma.couple.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return founding?.id === coupleId;
}

// GET /api/invites — invitations this couple has issued
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invites = await systemPrisma.invite.findMany({
    where: { OR: [{ coupleId: session.coupleId }, { coupleId: null }] },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const founder = await isFounder(session.coupleId);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return NextResponse.json({
    canInviteCouples: founder,
    invites: invites
      // Only the founding couple sees the open new-couple invitations.
      .filter((i) => i.coupleId === session.coupleId || founder)
      .map((i) => ({
        id: i.id,
        kind: i.coupleId ? "partner" : "couple",
        role: i.role,
        note: i.note,
        used: !!i.usedAt,
        expired: i.expiresAt < new Date(),
        expiresAt: i.expiresAt,
        url: `${base}/join/${i.token}`,
      })),
  });
}

// POST /api/invites — mint one
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const kind = body.kind === "couple" ? "couple" : "partner";
  const note = typeof body.note === "string" ? body.note.slice(0, 120) : null;

  if (kind === "couple" && !(await isFounder(session.coupleId))) {
    return NextResponse.json(
      { error: "Only the founding couple can invite another couple" },
      { status: 403 },
    );
  }

  let role: string | null = null;
  if (kind === "partner") {
    // Which side of this couple is still empty?
    const users = await systemPrisma.coupleUser.findMany({
      where: { coupleId: session.coupleId },
      select: { role: true },
    });
    const taken = new Set(users.map((u) => u.role));
    role = ["Wife", "Husband"].find((r) => !taken.has(r)) ?? null;
    if (!role) {
      return NextResponse.json({ error: "Both partners have already joined" }, { status: 400 });
    }
  }

  const token = randomBytes(24).toString("base64url");
  const invite = await systemPrisma.invite.create({
    data: {
      token,
      coupleId: kind === "partner" ? session.coupleId : null,
      role,
      note,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
    },
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return NextResponse.json(
    { id: invite.id, kind, role, url: `${base}/join/${token}`, expiresAt: invite.expiresAt },
    { status: 201 },
  );
}
