import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId || (userId !== 'Wife' && userId !== 'Husband')) {
      return NextResponse.json(
        { success: false, error: 'userId must be "Wife" or "Husband"' },
        { status: 400 }
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
