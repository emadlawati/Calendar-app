import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";

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

    const highlight = await prisma.dailyHighlight.upsert({
      where: { date },
      create: {
        date,
        note: note || null,
        photos: photosStr,
        createdBy: user,
      },
      update: {
        note: note || null,
        photos: photosStr,
        createdBy: user,
      },
    });

    return NextResponse.json(highlight, { status: 201 });
  } catch (error) {
    console.error("Highlight create error:", error);
    return NextResponse.json({ error: "Failed to save highlight" }, { status: 500 });
  }
}
