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

    const recentAcceptedEvent = await prisma.calendarEvent.findFirst({
      where: {
        status: "accepted",
        archived: false,
        memory: null,
      },
      orderBy: { date: "desc" },
    });

    if (!recentAcceptedEvent) {
      return NextResponse.json(null);
    }

    const eventDate = new Date(recentAcceptedEvent.date);
    const endTime = recentAcceptedEvent.endTime || "23:59";
    const [hours, minutes] = endTime.split(":").map(Number);
    const eventEnd = new Date(eventDate);
    eventEnd.setHours(hours, minutes, 0, 0);

    if (eventEnd >= now) {
      return NextResponse.json(null);
    }

    const daysAgo = Math.floor((now.getTime() - eventEnd.getTime()) / (1000 * 60 * 60 * 24));

    if (daysAgo > 14) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      event: {
        id: recentAcceptedEvent.id,
        title: recentAcceptedEvent.title,
        date: recentAcceptedEvent.date.toISOString(),
        time: recentAcceptedEvent.time,
        category: recentAcceptedEvent.category,
      },
      daysAgo,
    });
  } catch (error) {
    return NextResponse.json(null);
  }
}
