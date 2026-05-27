import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.calendarEvent.findMany({
      where: { status: "accepted", archived: false },
      orderBy: { date: "asc" },
      include: {
        memory: {
          select: { id: true, journal: true, photos: true },
        },
      },
    });

    const result = events.map((e) => {
      let memoryFirstPhoto: string | null = null;
      if (e.memory?.photos) {
        try {
          const arr = JSON.parse(e.memory.photos) as string[];
          memoryFirstPhoto = arr[0] ?? null;
        } catch { /* ignore */ }
      }
      return {
        id: e.id,
        title: e.title,
        date: e.date.toISOString(),
        time: e.time,
        endTime: e.endTime,
        category: e.category,
        allDay: e.allDay,
        notes: e.notes,
        memoryId: e.memory?.id ?? null,
        memoryJournal: e.memory?.journal ?? null,
        memoryFirstPhoto,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Timeline fetch error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
