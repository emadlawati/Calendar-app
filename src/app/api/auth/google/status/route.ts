import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { getRequestUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = await getRequestUser(searchParams.get('userId') || undefined);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = await prisma.googleCalendarToken.findUnique({
      where: { userId },
      select: { email: true, updatedAt: true },
    });

    return NextResponse.json({
      success: true,
      connected: !!token,
      email: token?.email || null,
      updatedAt: token?.updatedAt || null,
    });
  } catch (error) {
    console.error('Google Calendar status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check connection status' },
      { status: 500 }
    );
  }
}
