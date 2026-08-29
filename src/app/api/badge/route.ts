import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getEventNotificationRecipients } from "@/lib/people";

/**
 * How many of today's entries are yours — the number shown on the app icon.
 *
 * A home-screen widget is not something a web app can build: iOS widgets need
 * WidgetKit and Android needs AppWidgetProvider, both native. The Badging API
 * is the one thing the platforms do expose, so this is the count behind it.
 *
 * Events tagged for the other partner don't count towards yours, using the
 * same rule that decides who gets notified.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // "Today" in the family's own timezone, not the server's.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });
  const start = new Date(`${today}T00:00:00.000Z`);
  const end = new Date(`${today}T23:59:59.999Z`);

  const events = await prisma.calendarEvent.findMany({
    where: {
      archived: false,
      status: { in: ["accepted", "pending"] },
      OR: [
        { date: { gte: start, lte: end } },
        // Multi-day entries that span today.
        { AND: [{ date: { lte: end } }, { endDate: { gte: start } }] },
      ],
    },
    select: { personTag: true },
  });

  const count = events.filter((e) =>
    getEventNotificationRecipients(e.personTag).includes(user),
  ).length;

  return NextResponse.json({ count, date: today });
}
