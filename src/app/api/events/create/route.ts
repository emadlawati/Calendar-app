import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import resend from '@/lib/resend';
import { createCalendarEvent } from '@/lib/google-calendar';
import { getRequestUser } from '@/lib/auth';
import { getDisplayName } from '@/lib/names';
import { getCategoryById } from '@/lib/categories';
import { renderThemedEmail, getTheme } from '@/lib/email-themes';
import { sendPushToUser } from '@/lib/webpush';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, date, time, endTime, notes, category, allDay, createdBy: bodyCreatedBy, specialDateId } = body;
    let { endDate } = body;

    const createdBy = await getRequestUser(bodyCreatedBy);
    if (!createdBy) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Normalize endDate: same day → null; earlier day → reject
    if (endDate) {
      const startDay = new Date(date).toISOString().split("T")[0];
      const endDay = new Date(endDate).toISOString().split("T")[0];
      if (endDay === startDay) {
        endDate = null;
      } else if (endDay < startDay) {
        return NextResponse.json({ success: false, error: "End date must be after start date" }, { status: 400 });
      }
    }

    // Save event to database
    const newEvent = await prisma.calendarEvent.create({
      data: {
        title,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        time,
        endTime: endTime || null,
        notes,
        category: category || "other",
        allDay: allDay || false,
        createdBy,
        status: "pending",
        specialDateId: specialDateId || null,
      }
    });

    // Sync to the creator's Google Calendar immediately
    const dateStr = new Date(date).toISOString().split('T')[0];
    const endDateStr = endDate ? new Date(endDate).toISOString().split('T')[0] : null;
    const creatorGoogleEventId = await createCalendarEvent(createdBy, {
      title,
      date: dateStr,
      endDate: endDateStr,
      time,
      endTime: endTime || null,
      notes: notes || null,
      category: category || "other",
      allDay: allDay || false,
    });

    if (creatorGoogleEventId) {
      // Store the creator's Google Calendar event ID
      await prisma.calendarEvent.update({
        where: { id: newEvent.id },
        data: { creatorGoogleEventId },
      });
      newEvent.creatorGoogleEventId = creatorGoogleEventId;
      console.log(`Google Calendar event created for creator ${createdBy}: ${creatorGoogleEventId}`);
    }

    // Determine the recipient and sender emails
    const isWife = createdBy === "Wife";
    const partnerEmail = isWife ? process.env.HUSBAND_EMAIL : process.env.WIFE_EMAIL;
    const partnerName = isWife ? "Husband" : "Wife";
    const displayName = getDisplayName(createdBy);
    const cat = getCategoryById(category || "other");
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const adjustUrl = `${baseUrl}/events/adjust?id=${newEvent.id}&user=${partnerName}`;
    
    // Send Email via Resend
    if (partnerEmail && process.env.RESEND_API_KEY !== "re_...") {
      try {
        // Fetch linked special date for themed emails
        const specialDate = specialDateId
          ? await prisma.specialDate.findUnique({ where: { id: specialDateId } })
          : null;

        const themeKind = specialDate?.kind || null;
        const themedSubject = specialDate
          ? `${specialDate.emoji || "🐾"} ${specialDate.title}: ${title}`
          : `${cat.emoji} New Plan from ${displayName}: ${title}!`;
        const themedH1 = specialDate
          ? `${getTheme(themeKind).greeting(displayName, title)}`
          : `${cat.emoji} ${displayName} wants to plan something with you 🐾`;
        const cardHtml = `
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">${cat.label} — The Plan:</p>
          <h2 style="margin: 5px 0;">${title}</h2>
          <p style="margin: 5px 0;">📅 ${new Date(date).toLocaleDateString()}${endDate ? ` → ${new Date(endDate).toLocaleDateString()}` : ""}${allDay ? " · All day" : ` @ ${time}`}</p>
          ${notes ? `<p style="margin: 15px 0; font-style: italic;">"Meow Notes: ${notes}"</p>` : ""}`;
        const html = renderThemedEmail(themeKind, {
          h1: themedH1,
          cardHtml,
          acceptLink: `${baseUrl}/api/events/action?id=${newEvent.id}&action=accept&user=${partnerName}`,
          adjustLink: adjustUrl,
          baseUrl,
        });

        await resend.emails.send({
          from: 'Calendar 🐾 <noreply@yaminami.uk>',
          to: partnerEmail,
          subject: themedSubject,
          html,
        });
      } catch (emailError) {
        console.error("Email failed but event was saved:", emailError);
      }
    }

    // Push notification to partner
    sendPushToUser(partnerName, {
      title: `${cat.emoji} New Plan!`,
      body: `${displayName} invited you: ${title}`,
      url: `${baseUrl}/`,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Event created and invite sent to ${partnerName}`,
      event: newEvent
    });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create event" }, { status: 500 });
  }
}

