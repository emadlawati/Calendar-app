import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

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

    // Check if the event's date + endTime is in the past
    const eventDate = new Date(recentAcceptedEvent.date);
    const endTime = recentAcceptedEvent.endTime || "23:59";
    const [hours, minutes] = endTime.split(":").map(Number);
    const eventEnd = new Date(eventDate);
    eventEnd.setHours(hours, minutes, 0, 0);

    if (eventEnd >= now) {
      return NextResponse.json(null);
    }

    const daysAgo = Math.floor((now.getTime() - eventEnd.getTime()) / (1000 * 60 * 60 * 24));

    // Only show prompt for events within last 14 days
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
