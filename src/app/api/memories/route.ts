import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestUser, getCurrentUser } from "@/lib/auth";
import resend from "@/lib/resend";
import { getDisplayName } from "@/lib/names";
import { getCategoryById } from "@/lib/categories";
import { sendPushToUser } from "@/lib/webpush";
import type { User } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const memories = await prisma.memory.findMany({
      include: { event: true },
      orderBy: { createdAt: "desc" },
    });

    let filtered = memories;
    if (category && category !== "all") {
      filtered = filtered.filter((m) => m.event.category === category);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await getRequestUser(body.createdBy);

    const photos = Array.isArray(body.photos) ? JSON.stringify(body.photos) : null;

    // Upsert so that stale-state saves (both partners seeing the same
    // pending banner before either has saved) don't crash with a unique
    // constraint error. Last write wins on journal/photos.
    const memory = await prisma.memory.upsert({
      where: { eventId: body.eventId },
      create: {
        eventId: body.eventId,
        rating: 5,
        journal: body.journal || null,
        photos,
        createdBy: user ?? "Husband",
      },
      update: {
        journal: body.journal || null,
        photos,
        createdBy: user ?? "Husband",
      },
      include: { event: true },
    });

    // Notify partner that a memory was saved
    if (user) {
      const partnerKey = user === "Wife" ? "HUSBAND_EMAIL" : "WIFE_EMAIL";
      const partnerEmail = process.env[partnerKey];
      const cat = getCategoryById(memory.event.category);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      if (partnerEmail && process.env.RESEND_API_KEY !== "re_...") {
        resend.emails.send({
          from: "Calendar 🐾 <noreply@yaminami.uk>",
          to: partnerEmail,
          subject: `📸 ${getDisplayName(user)} saved a memory — ${memory.event.title}`,
          html: `
            <div style="font-family:sans-serif;background:#fdfbf7;padding:40px;border-radius:32px;color:#5d4037;border:2px solid #d7ccc8;">
              <h1 style="font-size:22px;color:#5d4037;">${getDisplayName(user)} just saved a memory 📸</h1>
              <div style="background:#fff;padding:20px;border-radius:20px;margin:16px 0;border:1px solid #ffeedb;">
                <p style="margin:0;font-size:13px;opacity:.7;">${cat.emoji} ${cat.label}</p>
                <h2 style="margin:4px 0;color:#5d4037;">${memory.event.title}</h2>
                ${memory.journal ? `<p style="margin:12px 0;font-style:italic;">"${memory.journal.slice(0, 200)}${memory.journal.length > 200 ? "…" : ""}"</p>` : ""}
              </div>
              <a href="${baseUrl}/memories" style="background:#fce4ec;color:#5d4037;padding:12px 24px;border-radius:20px;text-decoration:none;font-weight:bold;display:inline-block;">
                View Memory Wall 🐾
              </a>
            </div>
          `,
        }).catch((e: unknown) => console.error("Memory notification failed:", e));
      }

      // Push notification to partner
      const partner = user === "Wife" ? "Husband" as User : "Wife" as User;
      await sendPushToUser(partner, {
        title: `📸 New Memory!`,
        body: `${getDisplayName(user)} saved a memory for ${memory.event.title}`,
        url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/memories`,
      }).catch(() => {});
    }

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error("Memory create error:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}
