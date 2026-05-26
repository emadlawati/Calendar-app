import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
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

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error("Memory create error:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}
