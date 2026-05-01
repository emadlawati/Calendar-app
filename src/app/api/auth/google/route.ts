import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuthUrl } from '@/lib/google-calendar';

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

    const authUrl = getAuthUrl(userId);
    return NextResponse.json({ success: true, url: authUrl });
  } catch (error) {
    console.error('Google OAuth Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
  }
}
