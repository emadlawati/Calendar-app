import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { systemPrisma, withCouple } from "@/lib/prisma";
import prisma from "@/lib/prisma";
import { buildIcs } from "@/lib/ics";
import { getEventNotificationRecipients } from "@/lib/people";
import type { User } from "@/lib/types";

/**
 * The subscribable calendar feed.
 *
 * Public by necessity: iOS Calendar and Google Calendar fetch this with no
 * session and cannot send an Authorization header, so the token is the URL.
 * systemPrisma resolves which family the token belongs to — there is no scope
 * to work within until that is known — and everything after runs inside
 * withCouple(), so the reads are scoped like any other request.
 *
 * Read-only. Nothing here writes calendar data.
 */

/** Roughly a year back, so a client isn't handed a decade of history. */
const LOOK_BACK_DAYS = 365;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: raw } = await params;
  // Subscribing clients often append .ics; accept it either way.
  const token = raw.replace(/\.ics$/i, "");

  const feed = await systemPrisma.feedToken.findUnique({
    where: { token },
    include: { couple: { include: { users: true } } },
  });

  // Deliberately identical for an unknown token and a revoked one.
  if (!feed) {
    return new NextResponse("Not found", { status: 404 });
  }

  const since = new Date();
  since.setDate(since.getDate() - LOOK_BACK_DAYS);

  const { events, specialDates } = await withCouple(feed.coupleId, async () => {
    const [events, specialDates] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          archived: false,
          status: { in: ["accepted", "pending"] },
          OR: [{ date: { gte: since } }, { endDate: { gte: since } }],
        },
        select: {
          id: true, title: true, notes: true, date: true, endDate: true,
          time: true, endTime: true, allDay: true, status: true, personTag: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.specialDate.findMany({
        select: { id: true, title: true, date: true, type: true },
      }),
    ]);
    return { events, specialDates };
  });

  // The same rule that decides who gets notified: an entry tagged for one
  // partner stays off the other's calendar.
  const mine = events.filter((e) =>
    getEventNotificationRecipients(e.personTag).includes(feed.userId as User),
  );

  const member = feed.couple.users.find((u) => u.role === feed.userId);
  const calendarName = member
    ? `${feed.couple.displayName} — ${member.name}`
    : feed.couple.displayName;

  const body = buildIcs({ calendarName, events: mine, specialDates });

  // Best-effort: a failure here must not cost the subscriber their calendar.
  systemPrisma.feedToken
    .update({ where: { id: feed.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="calendar.ics"',
      // The URL is a credential; keep it out of shared caches.
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
