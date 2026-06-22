import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDisplayName } from "@/lib/names";
import { sendPushToUser } from "@/lib/webpush";
import type { User } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";
    const showSent = searchParams.get("sent") === "true";

    if (showAll) {
      const notes = await prisma.stickyNote.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json(notes);
    }

    if (showSent) {
      const notes = await prisma.stickyNote.findMany({
        where: { createdBy: user },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      return NextResponse.json(notes);
    }

    // Return unread notes sent TO the current user (by their partner)
    const notes = await prisma.stickyNote.findMany({
      where: {
        createdBy: { not: user },
        read: false,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Notes fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { content, doodle } = await request.json();
    const text = typeof content === "string" ? content.trim() : "";
    const doodleUrl = typeof doodle === "string" && doodle ? doodle : null;
    if (!text && !doodleUrl) {
      return NextResponse.json({ success: false, error: "content or doodle required" }, { status: 400 });
    }

    const note = await prisma.stickyNote.create({
      data: { content: text, doodle: doodleUrl, createdBy: user },
    });

    // A doodle is a little surprise — give the partner a gentle push
    if (doodleUrl) {
      const partner: User = user === "Wife" ? "Husband" : "Wife";
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      sendPushToUser(partner, {
        title: "🎨 New Doodle!",
        body: `${getDisplayName(user)} drew you something${text ? `: "${text}"` : " 💌"}`,
        url: `${baseUrl}/`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Note create error:", error);
    return NextResponse.json({ success: false, error: "Failed to create note" }, { status: 500 });
  }
}
