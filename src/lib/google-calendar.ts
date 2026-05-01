import { google } from 'googleapis';
import prisma from '@/lib/prisma';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(userId: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: userId,
  });
}

/**
 * Exchange authorization code for tokens and save to DB.
 */
export async function saveTokensFromCode(code: string, userId: string) {
  try {
    console.log('Starting saveTokensFromCode for user:', userId);
    
    const oauth2Client = getOAuth2Client();
    console.log('Got OAuth2 client');
    
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Got tokens from Google:', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date 
    });

    // Get user's email from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    console.log('Got user info:', { email: userInfo.email });

    // Typescript note: Prisma's upsert expects refreshToken to match in both
    // update and create. We use null coalescing to handle both.
    const refreshTokenValue = tokens.refresh_token ?? null;

    await prisma.googleCalendarToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: refreshTokenValue,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        email: userInfo.email ?? null,
      },
      create: {
        userId,
        accessToken: tokens.access_token!,
        refreshToken: refreshTokenValue,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        email: userInfo.email ?? null,
      },
    });
    console.log('Successfully saved tokens to database');
  } catch (error) {
    console.error('Error in saveTokensFromCode:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Get a valid authenticated OAuth2 client for a user, refreshing if needed.
 */
export async function getAuthenticatedClient(userId: string) {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });

  if (!tokenRecord) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken ?? undefined,
    expiry_date: tokenRecord.expiryDate?.getTime(),
  });

  // Check if token is expired and refresh if possible
  if (tokenRecord.expiryDate && tokenRecord.expiryDate < new Date()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await prisma.googleCalendarToken.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token!,
          expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      });
    } catch (err) {
      console.error(`Failed to refresh token for ${userId}:`, err);
      return null;
    }
  }

  return oauth2Client;
}

/**
 * Create a Google Calendar event for a user.
 * Returns the created event's ID or null on failure.
 */
export async function createCalendarEvent(
  userId: string,
  event: {
    title: string;
    date: string;     // YYYY-MM-DD
    time: string;     // HH:mm
    endTime: string | null;
    notes: string | null;
  }
): Promise<string | null> {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) return null;

  const calendar = google.calendar({ version: 'v3', auth });

  const startDateTime = `${event.date}T${event.time}:00`;
  const endDateTime = event.endTime
    ? `${event.date}T${event.endTime}:00`
    : `${event.date}T${event.time}:00`;

  // If no endTime, default to 1 hour
  const end = event.endTime
    ? endDateTime
    : new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();

  const timeZone = 'Asia/Muscat';

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `🐾 ${event.title}`,
        description: event.notes
          ? `From Couples Calendar 🐾\n\nNotes: ${event.notes}`
          : 'From Couples Calendar 🐾',
        start: {
          dateTime: startDateTime,
          timeZone,
        },
        end: {
          dateTime: end,
          timeZone,
        },
      },
    });

    return response.data.id || null;
  } catch (err) {
    console.error(`Failed to create Google Calendar event for ${userId}:`, err);
    return null;
  }
}

/**
 * Update an existing Google Calendar event (e.g. when date/time is adjusted).
 */
export async function updateCalendarEvent(
  googleEventId: string,
  userId: string,
  event: {
    title: string;
    date: string;     // YYYY-MM-DD
    time: string;     // HH:mm
    endTime: string | null;
    notes: string | null;
  }
): Promise<boolean> {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) return false;

  const calendar = google.calendar({ version: 'v3', auth });

  const startDateTime = `${event.date}T${event.time}:00`;
  const endDateTime = event.endTime
    ? `${event.date}T${event.endTime}:00`
    : `${event.date}T${event.time}:00`;

  const end = event.endTime
    ? endDateTime
    : new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();

  const timeZone = 'Asia/Muscat';

  try {
    await calendar.events.update({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: {
        summary: `🐾 ${event.title}`,
        description: event.notes
          ? `From Couples Calendar 🐾\n\nNotes: ${event.notes}`
          : 'From Couples Calendar 🐾',
        start: {
          dateTime: startDateTime,
          timeZone,
        },
        end: {
          dateTime: end,
          timeZone,
        },
      },
    });

    return true;
  } catch (err) {
    console.error(`Failed to update Google Calendar event ${googleEventId} for ${userId}:`, err);
    return false;
  }
}

/**
 * Delete a Google Calendar event.
 */
export async function deleteCalendarEvent(
  googleEventId: string,
  userId: string
): Promise<boolean> {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) return false;

  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });
    return true;
  } catch (err) {
    console.error(`Failed to delete Google Calendar event ${googleEventId} for ${userId}:`, err);
    return false;
  }
}
