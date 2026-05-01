import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { saveTokensFromCode } from '@/lib/google-calendar';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('state');

    if (!code || !userId) {
      console.error('Missing code or userId:', { code: !!code, userId: !!userId });
      return NextResponse.redirect(
        new URL('/?google=error&reason=missing_params', request.url)
      );
    }

    await saveTokensFromCode(code, userId);

    // Redirect back to the app with success
    return NextResponse.redirect(
      new URL(`/?google=connected&user=${userId}`, request.url)
    );
  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.redirect(
      new URL(`/?google=error&reason=callback_failed`, request.url)
    );
  }
}
