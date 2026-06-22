import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, getRequestUser } from "@/lib/auth";
import { getDisplayName } from "@/lib/names";
import { sendPushToUser } from "@/lib/webpush";
import resend from "@/lib/resend";
import type { CommentTarget, User } from "@/lib/types";

const VALID_TARGETS: CommentTarget[] = ["memory", "highlight"];

// GET /api/comments?targetType=memory&targetId=xxx — list a thread, oldest first
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

    const comments = await prisma.comment.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// POST /api/comments — create a comment and notify the partner
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await getRequestUser(body.createdBy);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const targetType = body.targetType as CommentTarget;
    const targetId = body.targetId as string;
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!targetType || !targetId || !VALID_TARGETS.includes(targetType)) {
      return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: { targetType, targetId, content, createdBy: user },
    });

    // Best-effort partner notification — never block the response
    notifyPartner(user, targetType, targetId, content).catch(() => {});

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Comment create error:", error);
    return NextResponse.json({ error: "Failed to save comment" }, { status: 500 });
  }
}

async function notifyPartner(
  user: User,
  targetType: CommentTarget,
  targetId: string,
  content: string,
) {
  const displayName = getDisplayName(user);
  const partner: User = user === "Wife" ? "Husband" : "Wife";
  const partnerEmail = partner === "Wife" ? process.env.WIFE_EMAIL : process.env.HUSBAND_EMAIL;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const preview = content.length > 80 ? content.slice(0, 80) + "…" : content;

  // Friendly label for the thing being commented on
  let label = targetType === "memory" ? "a memory" : "a highlight";
  try {
    if (targetType === "memory") {
      const m = await prisma.memory.findUnique({ where: { id: targetId }, include: { event: true } });
      if (m?.event?.title) label = `"${m.event.title}"`;
    } else {
      const h = await prisma.dailyHighlight.findUnique({ where: { id: targetId } });
      if (h?.date) {
        const dt = new Date(h.date + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric",
        });
        label = `the highlight from ${dt}`;
      }
    }
  } catch { /* ignore — fall back to generic label */ }

  // Push notification
  await sendPushToUser(partner, {
    title: "💬 New Comment!",
    body: `${displayName} commented on ${label}: "${preview}"`,
    url: `${baseUrl}/memories`,
  }).catch(() => {});

  // Email notification
  if (partnerEmail && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_...") {
    resend.emails.send({
      from: "Calendar 🐾 <noreply@yaminami.uk>",
      to: partnerEmail,
      subject: `💬 ${displayName} commented on ${targetType === "memory" ? "a memory" : "a highlight"}`,
      html: `
        <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
          <h1 style="color: #5d4037; font-size: 24px;">💬 ${displayName} left a comment!</h1>
          <p style="color: #5d4037; opacity: 0.7; margin: 8px 0 20px;">On ${label}</p>
          <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
            <p style="margin: 0; font-style: italic; font-size: 15px; color: #5d4037;">"${content}"</p>
          </div>
          <a href="${baseUrl}/memories" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
            Reply 🐾
          </a>
          <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">Sent with love from Purrfect Plans 🐾</p>
        </div>
      `,
    }).catch((e: unknown) => console.error("Comment notification email failed:", e));
  }
}
