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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memory = await prisma.memory.create({
      data: {
        eventId: body.eventId,
        rating: 5,
        journal: body.journal || null,
        photoUrl: body.photoUrl || null,
        createdBy: user,
      },
      include: { event: true },
    });

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error("Memory create error:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}
