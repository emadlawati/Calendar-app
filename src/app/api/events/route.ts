import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showArchived = searchParams.get('showArchived') === 'true';

    const events = await prisma.calendarEvent.findMany({
      where: showArchived ? {} : { archived: false },
      orderBy: { date: 'asc' }
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch events" }, { status: 500 });
  }
}
