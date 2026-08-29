import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { systemPrisma } from "@/lib/prisma";

/**
 * GET /api/invites/[token] — what an invitation is for, before signing in.
 * Public by necessity: the recipient has no session yet. Returns only what
 * the join page needs to render, never the couple's data.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const invite = await systemPrisma.invite.findUnique({
    where: { token },
    include: { couple: { select: { displayName: true } } },
  });

  if (!invite) {
    return NextResponse.json({ valid: false, reason: "unknown" }, { status: 404 });
  }
  if (invite.usedAt) {
    return NextResponse.json({ valid: false, reason: "used" }, { status: 410 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    kind: invite.coupleId ? "partner" : "couple",
    role: invite.role,
    // Present only for partner invites, so they know whose library they're joining.
    couple: invite.couple?.displayName ?? null,
  });
}
