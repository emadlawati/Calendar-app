import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { eventActionUrl } from '@/lib/action-links';
import resend from '@/lib/resend';
import { createCalendarEvent } from '@/lib/google-calendar';
import { getRequestUser } from '@/lib/auth';
import { getCoupleContext } from "@/lib/couple-context";
import { getCategoryById } from '@/lib/categories';
import { renderThemedEmail, getTheme } from '@/lib/email-themes';
import { sendPushToUser } from '@/lib/webpush';
import { getEventNotificationRecipients } from '@/lib/people';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, date, time, endTime, notes, category, allDay, createdBy: bodyCreatedBy, specialDateId, personTag } = body;
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
        personTag: personTag || null,
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

    // Who should hear about this: only the other partner, and only if the
    // event's person-tag actually includes them ("wife"/"husband" tags are
    // exclusive to that partner; family/couple/child/untagged notify both).
    const notifyTarget = getEventNotificationRecipients(personTag).find((u) => u !== createdBy) ?? null;
    const couple = await getCoupleContext();
    const partnerEmail = notifyTarget ? couple?.email(notifyTarget) ?? null : null;
    const displayName = couple?.name(createdBy) ?? createdBy;
    const cat = getCategoryById(category || "other");

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const adjustUrl = `${baseUrl}/events/adjust?id=${newEvent.id}&user=${notifyTarget}`;

    // Send Email via Resend
    if (notifyTarget && partnerEmail && process.env.RESEND_API_KEY !== "re_...") {
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
          acceptLink: eventActionUrl(baseUrl, newEvent.id, notifyTarget),
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

    // Push notification to whoever this event is actually for
    if (notifyTarget) {
      sendPushToUser(notifyTarget, {
        title: `${cat.emoji} New Plan!`,
        body: `${displayName} invited you: ${title}`,
        url: `${baseUrl}/`,
      });
    }

    return NextResponse.json({
      success: true,
      message: notifyTarget ? `Event created and invite sent to ${notifyTarget}` : "Event created",
      event: newEvent
    });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create event" }, { status: 500 });
  }
}

