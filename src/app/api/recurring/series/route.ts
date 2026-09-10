import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateInstances } from "@/lib/recurring";
import type { Frequency } from "@/lib/recurring";

export const dynamic = "force-dynamic";

/**
 * Reading and amending the run of a repeating entry.
 *
 * The end date has always been stored on the series and never shown once the
 * series existed: opening an occurrence to amend it offered the one-off
 * "Closes" field, so there was no way to see when a repeat was set to stop,
 * let alone move it. You could only delete the series and build it again.
 *
 * Everything here is addressed by any one of its occurrences, because that is
 * what the person is looking at when they want to change it.
 */

/** The series behind an occurrence, and how far it runs. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });

  // Tenant-scoped, so an id from another family simply is not found.
  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId },
    select: { seriesId: true },
  });
  if (!event?.seriesId) return NextResponse.json({ series: null });

  const series = await prisma.recurringSeries.findFirst({
    where: { id: event.seriesId },
    select: { id: true, frequency: true, startDate: true, endDate: true, status: true },
  });
  if (!series) return NextResponse.json({ series: null });

  const total = await prisma.calendarEvent.count({ where: { seriesId: series.id } });
  const last = await prisma.calendarEvent.findFirst({
    where: { seriesId: series.id },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  return NextResponse.json({
    series: {
      id: series.id,
      frequency: series.frequency,
      startDate: series.startDate.toISOString().slice(0, 10),
      // null means "no end set" — it keeps generating a year ahead.
      endDate: series.endDate ? series.endDate.toISOString().slice(0, 10) : null,
      status: series.status,
      occurrences: total,
      lastGenerated: last ? last.date.toISOString().slice(0, 10) : null,
    },
  });
}

/**
 * Move where the run stops, and make the occurrences match.
 *
 * Shortening deletes the occurrences past the new end — but only ones still to
 * come, and only ones nothing is attached to. An occurrence with a memory on it
 * would take the memory with it (Memory cascades from the event), and losing a
 * photograph because a repeat was shortened would be indefensible. Those are
 * kept and reported back.
 *
 * Lengthening fills forward from wherever generation last reached.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const eventId = typeof body?.eventId === "string" ? body.eventId : null;
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });

  const raw = body?.until;
  const clearing = raw === null || raw === "";
  const until = clearing
    ? null
    : new Date(`${String(raw).slice(0, 10)}T00:00:00.000Z`);
  if (until && Number.isNaN(until.getTime())) {
    return NextResponse.json({ error: "That end date isn't a date" }, { status: 400 });
  }

  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId },
    select: { seriesId: true },
  });
  if (!event?.seriesId) {
    return NextResponse.json({ error: "That entry does not repeat" }, { status: 400 });
  }

  const series = await prisma.recurringSeries.findFirst({ where: { id: event.seriesId } });
  if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });

  if (until && until < series.startDate) {
    return NextResponse.json(
      { error: "A repeat cannot stop before it starts" },
      { status: 400 },
    );
  }

  await prisma.recurringSeries.update({
    where: { id: series.id },
    data: { endDate: until },
  });

  let removed = 0;
  let kept = 0;

  if (until) {
    // Never rewrite history: today and everything before it stays exactly as
    // it was, whatever the new end date says.
    const todayUtc = new Date(
      `${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" })}T00:00:00.000Z`,
    );
    const floor = until > todayUtc ? until : todayUtc;

    const doomed = await prisma.calendarEvent.findMany({
      where: { seriesId: series.id, date: { gt: floor } },
      select: { id: true, memories: { select: { id: true } } },
    });

    const free = doomed.filter((e) => e.memories.length === 0).map((e) => e.id);
    kept = doomed.length - free.length;

    if (free.length > 0) {
      const res = await prisma.calendarEvent.deleteMany({ where: { id: { in: free } } });
      removed = res.count;
    }

    // So a later extension knows where to resume from.
    await prisma.recurringSeries.update({
      where: { id: series.id },
      data: { generatedUntil: floor < series.startDate ? series.startDate : floor },
    });
  } else {
    // No end, or a later one: fill forward from where generation reached.
    await generateInstances(
      series.id,
      series.title,
      series.startDate,
      series.time,
      series.endTime,
      series.notes,
      series.category,
      series.allDay,
      series.createdBy,
      series.frequency as Frequency,
      null,
    );
  }

  if (until) {
    // A longer run than before still needs the gap filling in.
    await generateInstances(
      series.id,
      series.title,
      series.startDate,
      series.time,
      series.endTime,
      series.notes,
      series.category,
      series.allDay,
      series.createdBy,
      series.frequency as Frequency,
      until,
    );
  }

  const occurrences = await prisma.calendarEvent.count({ where: { seriesId: series.id } });

  return NextResponse.json({
    ok: true,
    endDate: until ? until.toISOString().slice(0, 10) : null,
    removed,
    // Occurrences past the new end that were left alone because a memory is
    // attached to them.
    keptWithMemories: kept,
    occurrences,
  });
}
