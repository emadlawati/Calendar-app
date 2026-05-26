import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const TZ = "Asia/Muscat";

function getGulfDate(date: Date): Date {
  return new Date(date.toLocaleDateString("en-CA", { timeZone: TZ }));
}

function getGulfNow(): Date {
  return new Date(new Date().toLocaleString("en-CA", { timeZone: TZ }));
}

export async function GET() {
  try {
    const now = getGulfNow();

    // Fetch candidates: accepted, unarchived, no memory, date not in the future
    const candidates = await prisma.calendarEvent.findMany({
      where: {
        status: "accepted",
        archived: false,
        memory: null,
        date: { lte: new Date() },
      },
      orderBy: { date: "desc" },
      take: 20,
    });

    // Find the most recent event that has actually ended
    let targetEvent = null;
    for (const ev of candidates) {
      const endTime = ev.endTime || "23:59";
      const [hours, minutes] = endTime.split(":").map(Number);
      const eventEnd = new Date(ev.date);
      eventEnd.setHours(hours, minutes, 0, 0);
      if (eventEnd < now) {
        targetEvent = ev;
        break;
      }
    }

    if (!targetEvent) {
      return NextResponse.json(null);
    }

    const endTime = targetEvent.endTime || "23:59";
    const [hours, minutes] = endTime.split(":").map(Number);
    const eventEnd = new Date(targetEvent.date);
    eventEnd.setHours(hours, minutes, 0, 0);

    const daysAgo = Math.floor((now.getTime() - eventEnd.getTime()) / (1000 * 60 * 60 * 24));

    if (daysAgo > 14) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      event: {
        id: targetEvent.id,
        title: targetEvent.title,
        date: targetEvent.date.toISOString(),
        time: targetEvent.time,
        category: targetEvent.category,
      },
      daysAgo,
    });
  } catch (error) {
    return NextResponse.json(null);
  }
}
