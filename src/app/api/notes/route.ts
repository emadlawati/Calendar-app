import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCoupleContext, type CoupleContext } from "@/lib/couple-context";
import { sendPushToUser } from "@/lib/webpush";
import resend from "@/lib/resend";
import type { User, NoteKind } from "@/lib/types";

const VALID_KINDS: NoteKind[] = ["note", "gratitude"];

// GET /api/notes — the full log: every note, sent and received, newest first.
// ?unread=true returns only unread notes addressed to the current user.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get("unread") === "true") {
      const unread = await prisma.note.findMany({
        where: { createdBy: { not: user }, read: false },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(unread);
    }

    const notes = await prisma.note.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(notes);
  } catch (error) {
    console.error("Notes fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

// POST /api/notes — send a note or an appreciation to your partner
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const kind: NoteKind = VALID_KINDS.includes(body.kind) ? body.kind : "note";

    if (!content) {
      return NextResponse.json({ error: "Cannot be empty" }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: { content, kind, createdBy: user },
    });

    const couple = await getCoupleContext();
    notifyPartner(couple, user, kind, content).catch(() => {});

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Note create error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

async function notifyPartner(cpl: CoupleContext | null, user: User, kind: NoteKind, content: string) {
  const displayName = cpl?.name(user) ?? user;
  const partner: User = user === "Wife" ? "Husband" : "Wife";
  const partnerEmail = cpl?.email(partner) ?? null;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const preview = content.length > 80 ? content.slice(0, 80) + "…" : content;
  const isGratitude = kind === "gratitude";
  const emoji = isGratitude ? "💛" : "💌";
  const label = isGratitude ? "appreciates you" : "sent you a note";

  await sendPushToUser(partner, {
    title: `${emoji} ${isGratitude ? "New Appreciation!" : "New Note!"}`,
    body: `${displayName}: "${preview}"`,
    url: `${baseUrl}/notes`,
  }).catch(() => {});

  if (partnerEmail && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_...") {
    resend.emails.send({
      from: "Calendar 🐾 <noreply@yaminami.uk>",
      to: partnerEmail,
      subject: `${emoji} ${displayName} ${label}`,
      html: `
        <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
          <h1 style="color: #5d4037; font-size: 24px;">${emoji} ${displayName} ${label}</h1>
          <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
            <p style="margin: 0; font-style: italic; font-size: 16px; color: #5d4037;">"${content}"</p>
          </div>
          <a href="${baseUrl}/notes" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
            Open Notes 🐾
          </a>
          <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">Sent with love from Purrfect Plans 🐾</p>
        </div>
      `,
    }).catch((e: unknown) => console.error("Note notification email failed:", e));
  }
}
