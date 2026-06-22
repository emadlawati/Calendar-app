import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, getRequestUser } from "@/lib/auth";
import { getDisplayName } from "@/lib/names";
import { sendPushToUser } from "@/lib/webpush";
import resend from "@/lib/resend";
import type { User } from "@/lib/types";

// GET /api/gratitude — all appreciation entries, newest first
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const entries = await prisma.gratitude.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Failed to fetch gratitude" }, { status: 500 });
  }
}

// POST /api/gratitude — add an appreciation + notify partner
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await getRequestUser(body.createdBy);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return NextResponse.json({ error: "Cannot be empty" }, { status: 400 });

    const entry = await prisma.gratitude.create({ data: { content, createdBy: user } });

    notifyPartner(user, content).catch(() => {});

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Gratitude create error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

async function notifyPartner(user: User, content: string) {
  const displayName = getDisplayName(user);
  const partner: User = user === "Wife" ? "Husband" : "Wife";
  const partnerEmail = partner === "Wife" ? process.env.WIFE_EMAIL : process.env.HUSBAND_EMAIL;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const preview = content.length > 80 ? content.slice(0, 80) + "…" : content;

  await sendPushToUser(partner, {
    title: "💛 New Appreciation!",
    body: `${displayName} appreciates: "${preview}"`,
    url: `${baseUrl}/gratitude`,
  }).catch(() => {});

  if (partnerEmail && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_...") {
    resend.emails.send({
      from: "Calendar 🐾 <noreply@yaminami.uk>",
      to: partnerEmail,
      subject: `💛 ${displayName} added something to the Gratitude Jar`,
      html: `
        <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
          <h1 style="color: #5d4037; font-size: 24px;">💛 ${displayName} appreciates you</h1>
          <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
            <p style="margin: 0; font-style: italic; font-size: 16px; color: #5d4037;">"${content}"</p>
          </div>
          <a href="${baseUrl}/gratitude" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
            Open the Jar 🫙
          </a>
          <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">Sent with love from Purrfect Plans 🐾</p>
        </div>
      `,
    }).catch((e: unknown) => console.error("Gratitude notification email failed:", e));
  }
}
