import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.calendarEvent.findMany({
      where: { status: "accepted", archived: false },
      orderBy: { date: "asc" },
      include: {
        memories: {
          select: { id: true, journal: true, photos: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const result = events.map((e) => {
      // Timeline is the shared story — surface the first memory either partner saved
      const mem = e.memories[0] ?? null;
      let memoryFirstPhoto: string | null = null;
      if (mem?.photos) {
        try {
          const arr = JSON.parse(mem.photos) as string[];
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
        memoryId: mem?.id ?? null,
        memoryJournal: mem?.journal ?? null,
        memoryFirstPhoto,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Timeline fetch error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
