import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, getRequestUser } from "@/lib/auth";
import { getDisplayName } from "@/lib/names";
import { sendPushToUser } from "@/lib/webpush";
import { REACTION_EMOJIS } from "@/lib/reactions";
import { getTargetOwner } from "@/lib/content-target";
import type { CommentTarget, User } from "@/lib/types";

const VALID_TARGETS: CommentTarget[] = ["memory", "highlight"];

// GET /api/reactions?targetType=memory&targetId=xxx — all reactions for a target
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType") as CommentTarget | null;
    const targetId = searchParams.get("targetId");
    if (!targetType || !targetId || !VALID_TARGETS.includes(targetType)) {
      return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
    }

    const reactions = await prisma.reaction.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(reactions);
  } catch {
    return NextResponse.json({ error: "Failed to fetch reactions" }, { status: 500 });
  }
}

// POST /api/reactions — toggle a reaction (add if missing, remove if present)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await getRequestUser(body.createdBy);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const targetType = body.targetType as CommentTarget;
    const targetId = body.targetId as string;
    const emoji = body.emoji as string;

    if (!targetType || !targetId || !VALID_TARGETS.includes(targetType)) {
      return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
    }
    if (!emoji || !REACTION_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    // Only the partner (non-owner) may react to a memory/highlight
    const ownerId = await getTargetOwner(targetType, targetId);
    if (!ownerId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (ownerId === user) {
      return NextResponse.json({ error: "You can only react to your partner's posts" }, { status: 403 });
    }

    const existing = await prisma.reaction.findUnique({
      where: { targetType_targetId_createdBy_emoji: { targetType, targetId, createdBy: user, emoji } },
    });

    let added: boolean;
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      added = false;
    } else {
      await prisma.reaction.create({ data: { targetType, targetId, emoji, createdBy: user } });
      added = true;
      // Notify partner (push only — keep it light, no email)
      notifyPartner(user, targetType, targetId, emoji).catch(() => {});
    }

    const reactions = await prisma.reaction.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ added, reactions });
  } catch (error) {
    console.error("Reaction toggle error:", error);
    return NextResponse.json({ error: "Failed to react" }, { status: 500 });
  }
}

async function notifyPartner(user: User, targetType: CommentTarget, targetId: string, emoji: string) {
  const displayName = getDisplayName(user);
  const partner: User = user === "Wife" ? "Husband" : "Wife";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const what = targetType === "memory" ? "your memory" : "your highlight";
  await sendPushToUser(partner, {
    title: `${emoji} New Reaction!`,
    body: `${displayName} reacted ${emoji} to ${what}`,
    url: `${baseUrl}/memories`,
  }).catch(() => {});
}
