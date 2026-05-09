import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    if (showAll) {
      const notes = await prisma.stickyNote.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
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

    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ success: false, error: "content required" }, { status: 400 });
    }

    const note = await prisma.stickyNote.create({
      data: { content, createdBy: user },
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Note create error:", error);
    return NextResponse.json({ success: false, error: "Failed to create note" }, { status: 500 });
  }
}
