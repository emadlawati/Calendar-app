import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";
import { getCoupleContext, type CoupleContext } from "@/lib/couple-context";
import { pushAndReport, emailConfigured } from "@/lib/notify";
import resend from "@/lib/resend";

// GET /api/highlights — return all highlights ordered by date desc
export async function GET() {
  try {
    const highlights = await prisma.dailyHighlight.findMany({
      orderBy: { date: "desc" },
    });
    return NextResponse.json(highlights);
  } catch {
    return NextResponse.json({ error: "Failed to fetch highlights" }, { status: 500 });
  }
}

// POST /api/highlights — create or update a highlight for a date (upsert)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await getRequestUser(body.createdBy);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { date, note, photos } = body;
    if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

    const photosStr = Array.isArray(photos) && photos.length > 0 ? JSON.stringify(photos) : null;

    // One highlight per person per day, per couple. find-then-write because
    // the unique key is now (coupleId, date, createdBy) and the scoping
    // extension supplies the coupleId half — which is precisely what stops
    // one couple's highlight from overwriting another's on the same date.
    const existing = await prisma.dailyHighlight.findFirst({
      where: { date, createdBy: user },
    });
    const highlight = existing
      ? await prisma.dailyHighlight.update({
          where: { id: existing.id },
          data: { note: note || null, photos: photosStr },
        })
      : await prisma.dailyHighlight.create({
          data: { date, note: note || null, photos: photosStr, createdBy: user },
        });

    // Notify partner about the new highlight
    const couple = await getCoupleContext();
    const displayName = couple?.name(user) ?? user;
    const partner = user === "Wife" ? "Husband" : "Wife";
    const partnerEmail = couple?.email(partner) ?? null;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const dateStr = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
    const preview = note
      ? note.length > 60 ? note.slice(0, 60) + "…" : note
      : "No note";

    // Push notification
    const delivery = await pushAndReport([partner], {
      title: `⭐ New Highlight!`,
      body: `${displayName} added a highlight for ${dateStr}: "${preview}"`,
      url: `${baseUrl}/`,
    });

    // Email notification
    // Email only if push didn't reach them — otherwise it's the same
    // notification twice. See lib/notify.ts.
    if (partnerEmail && emailConfigured() && delivery.needEmail.length > 0) {
      const photoCount = Array.isArray(photos) && photos.length > 0 ? photos.length : 0;
      resend.emails.send({
        from: "Calendar \uD83D\uDC3E <noreply@yaminami.uk>",
        to: partnerEmail,
        subject: `⭐ ${displayName} added a daily highlight — ${dateStr}`,
        html: `
          <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
            <h1 style="color: #5d4037; font-size: 24px;">⭐ ${displayName} captured a moment!</h1>
            <p style="color: #5d4037; opacity: 0.7; margin: 8px 0 20px;">Daily highlight for ${dateStr}</p>
            <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
              ${note ? `<p style="margin: 0 0 12px; font-style: italic; font-size: 15px; color: #5d4037;">"${note}"</p>` : ""}
              ${photoCount > 0 ? `<p style="margin: 0; font-size: 13px; color: #5d4037; opacity: 0.7;">📷 ${photoCount} photo${photoCount > 1 ? "s" : ""} attached</p>` : ""}
            </div>
            <a href="${baseUrl}" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
              Open Calendar 🐾
            </a>
            <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">Sent with love from Purrfect Plans 🐾</p>
          </div>
        `,
      }).catch((e: unknown) => console.error("Highlight notification email failed:", e));
    }

    return NextResponse.json(highlight, { status: 201 });
  } catch (error) {
    console.error("Highlight create error:", error);
    return NextResponse.json({ error: "Failed to save highlight" }, { status: 500 });
  }
}
