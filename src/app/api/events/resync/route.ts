import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { createCalendarEvent } from '@/lib/google-calendar';

interface SyncResult {
  eventId: string;
  title: string;
  creatorSynced: boolean;
  accepterSynced: boolean;
  error?: string;
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId || (userId !== "Wife" && userId !== "Husband")) {
      return NextResponse.json({ success: false, error: "Valid userId (Wife or Husband) is required" }, { status: 400 });
    }

    // Fetch all non-archived events
    const allEvents = await prisma.calendarEvent.findMany({
      where: { archived: false },
      orderBy: { date: 'asc' },
    });

    const results: SyncResult[] = [];
    let syncedCount = 0;

    for (const event of allEvents) {
      const result: SyncResult = {
        eventId: event.id,
        title: event.title,
        creatorSynced: false,
        accepterSynced: false,
      };

      const dateStr = event.date.toISOString().split('T')[0];

      // Sync creator's event: the user who created it
      const isCreator = event.createdBy === userId;
      if (isCreator && !event.creatorGoogleEventId) {
        try {
          const googleEventId = await createCalendarEvent(userId, {
            title: event.title,
            date: dateStr,
            time: event.time,
            endTime: event.endTime,
            notes: event.notes,
          });

          if (googleEventId) {
            await prisma.calendarEvent.update({
              where: { id: event.id },
              data: { creatorGoogleEventId: googleEventId },
            });
            result.creatorSynced = true;
            syncedCount++;
            console.log(`Resync: Created creator event for ${userId}: ${event.title}`);
          }
        } catch (err) {
          result.error = `Creator sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
          console.error(`Resync: Failed to create creator event for ${userId}:`, err);
        }
      }

      // Sync accepter's event: only if event is accepted, and the accepter is this user
      const isAccepted = event.status === 'accepted';
      const accepter = event.createdBy === "Wife" ? "Husband" : "Wife";
      const isAccepter = accepter === userId;

      if (isAccepted && isAccepter && !event.googleEventId) {
        try {
          const googleEventId = await createCalendarEvent(userId, {
            title: event.title,
            date: dateStr,
            time: event.time,
            endTime: event.endTime,
            notes: event.notes,
          });

          if (googleEventId) {
            await prisma.calendarEvent.update({
              where: { id: event.id },
              data: { googleEventId: googleEventId },
            });
            result.accepterSynced = true;
            syncedCount++;
            console.log(`Resync: Created accepter event for ${userId}: ${event.title}`);
          }
        } catch (err) {
          result.error = (result.error ? result.error + '; ' : '') + `Accepter sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
          console.error(`Resync: Failed to create accepter event for ${userId}:`, err);
        }
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      message: `Resync complete. Synced ${syncedCount} events to ${userId}'s Google Calendar.`,
      syncedCount,
      totalEvents: allEvents.length,
      results,
    });
  } catch (error) {
    console.error("Resync Error:", error);
    return NextResponse.json({ success: false, error: "Failed to resync events" }, { status: 500 });
  }
}
