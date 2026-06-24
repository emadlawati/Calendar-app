import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const showArchived = searchParams.get('showArchived') === 'true';

    const events = await prisma.calendarEvent.findMany({
      where: showArchived ? {} : { archived: false },
      orderBy: { date: 'asc' },
      include: { memories: { select: { id: true, createdBy: true } } },
    });
    // memoryId = the current user's own memory for this event (null if none yet),
    // so the "save memory" prompt and 📸 marker are per-person.
    const mapped = events.map(({ memories, ...ev }) => ({
      ...ev,
      memoryId: memories.find((m) => m.createdBy === user)?.id ?? null,
    }));
    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch events" }, { status: 500 });
  }
}
