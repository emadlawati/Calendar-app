import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import resend from '@/lib/resend';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, date, time, user, eventId } = body;

    if (!eventId) {
      return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 });
    }

    if (action === 'accept') {
      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { status: 'accepted' }
      });
      return NextResponse.json({ success: true, message: "Event accepted" });
    }

    if (action === 'adjust') {
      // Fetch the current event before updating so we know who created it
      const existingEvent = await prisma.calendarEvent.findUnique({
        where: { id: eventId }
      });

      if (!existingEvent) {
        return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
      }

      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          status: 'adjusted',
          date: new Date(date),
          time: time
        }
      });

      // Send email notification to the original event creator
      const adjuster = user || "Your partner";
      const originalCreator = existingEvent.createdBy;
      const recipientEmail = originalCreator === "Wife"
        ? process.env.WIFE_EMAIL
        : process.env.HUSBAND_EMAIL;
      const recipientName = originalCreator === "Wife" ? "Wife" : "Husband";

      if (recipientEmail && process.env.RESEND_API_KEY !== "re_...") {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const newDateFormatted = formatDate(new Date(date));

        try {
          await resend.emails.send({
            from: 'Calendar 🐾 <noreply@yaminami.uk>',
            to: recipientEmail,
            subject: `🐾 ${existingEvent.title} — ${adjuster} proposed a new time!`,
            html: `
              <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
                <h1 style="color: #5d4037; font-size: 24px;">Meow! ${adjuster} wants to adjust the plan 🐾</h1>

                <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
                  <p style="margin: 0; font-size: 14px; color: #5d4037; opacity: 0.8;">The Plan:</p>
                  <h2 style="margin: 5px 0; color: #5d4037;">${existingEvent.title}</h2>
                  <p style="margin: 5px 0;">📅 Was: ${formatDate(existingEvent.date)} @ ${existingEvent.time}</p>
                  <p style="margin: 5px 0; color: #e91e63;">✏️ Proposed: ${newDateFormatted} @ ${time}</p>
                  ${existingEvent.notes ? `<p style="margin: 15px 0; font-style: italic; color: #5d4037;">"Meow Notes: ${existingEvent.notes}"</p>` : ''}
                </div>

                <div style="margin-top: 20px;">
                  <a href="${baseUrl}/api/events/action?id=${eventId}&action=accept" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Meow Accept 🧶
                  </a>
                </div>

                <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">You can also view your calendar to see the updated plan.</p>
              </div>
            `
          });
        } catch (emailError) {
          console.error("Adjustment email failed:", emailError);
        }
      }

      const partner = user === "Wife" ? "Husband" : "Wife";
      return NextResponse.json({ success: true, message: `Adjustment proposed to ${partner}` });
    }

    if (action === 'delete') {
      await prisma.calendarEvent.delete({
        where: { id: eventId }
      });
      return NextResponse.json({ success: true, message: "Event deleted" });
    }

    if (action === 'archive') {
      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { archived: true }
      });
      return NextResponse.json({ success: true, message: "Event archived" });
    }

    if (action === 'unarchive') {
      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { archived: false }
      });
      return NextResponse.json({ success: true, message: "Event unarchived" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process action" }, { status: 500 });
  }
}
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    const action = searchParams.get('action');

    if (!eventId || action !== 'accept') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    await prisma.calendarEvent.update({
      where: { id: eventId },
      data: { status: 'accepted' }
    });

    // Redirect to home with a success message
    return NextResponse.redirect(new URL('/?accepted=true', request.url));
  } catch (error) {
    console.error("Action GET Error:", error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
