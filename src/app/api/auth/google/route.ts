import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuthUrl } from '@/lib/google-calendar';
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
