import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma, { systemPrisma, withCouple } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { verifyEventAction, eventActionUrl } from '@/lib/action-links';
import resend from '@/lib/resend';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';
import { getRequestUser } from '@/lib/auth';
import { getCoupleContext } from "@/lib/couple-context";
import { getCategoryById } from '@/lib/categories';
import { recalculateStreaks } from '@/lib/streaks';
import { getBadgeById } from '@/lib/achievements';
import { sendPushToUser } from '@/lib/webpush';
import { getEventNotificationRecipients } from '@/lib/people';

/** "Mar 6" or "Mar 6 → Mar 8" for multi-day events */
function formatDateRange(date: Date, endDate: Date | null): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
  const startStr = date.toLocaleDateString("en-US", opts);
  if (!endDate) return startStr;
  return `${startStr} → ${endDate.toLocaleDateString("en-US", opts)}`;
}

/**
 * Accepting one occurrence of a recurring series accepts the whole series —
 * you shouldn't have to tap "accept" 52 times for a weekly plan.
 * Returns the clicked event plus how many occurrences were flipped to accepted.
 */
async function acceptEventOrSeries(eventId: string) {
  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) return { event: null, acceptedCount: 0 };

  if (event.seriesId) {
    const res = await prisma.calendarEvent.updateMany({
      where: { seriesId: event.seriesId, status: { not: "accepted" } },
      data: { status: "accepted" },
    });
    return { event, acceptedCount: res.count };
  }

  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: { status: "accepted" },
  });
  return { event, acceptedCount: 1 };
}

/**
 * Google Calendar sync for an accepted series. The clicked occurrence is
 * synced by the caller; this covers the remaining future occurrences so
 * edits/deletes of those instances reach Google too. Capped so accepting a
 * long series stays snappy — the horizon regenerates anyway.
 */
async function syncSeriesOccurrencesToGoogle(user: string, clickedEvent: { id: string; seriesId: string | null; date: Date }) {
  if (!clickedEvent.seriesId) return;
  const occurrences = await prisma.calendarEvent.findMany({
    where: {
      seriesId: clickedEvent.seriesId,
      date: { gte: clickedEvent.date },
      archived: false,
    },
    orderBy: { date: "asc" },
    take: 12,
  });
  for (const occ of occurrences) {
    if (occ.id === clickedEvent.id || occ.googleEventId) continue;
    const googleEventId = await createCalendarEvent(user, {
      title: occ.title,
      date: occ.date.toISOString().split('T')[0],
      endDate: occ.endDate ? occ.endDate.toISOString().split('T')[0] : null,
      time: occ.time,
      endTime: occ.endTime,
      notes: occ.notes,
      category: occ.category,
      allDay: occ.allDay,
    });
    if (googleEventId) {
      await prisma.calendarEvent.update({
        where: { id: occ.id },
        data: { googleEventId },
      }).catch(() => {});
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, date, time, title, notes: adjustNotes, endTime, category: adjustCategory, allDay, user: bodyUser, eventId, endDate, specialDateId, personTag } = body;

    const user = await getRequestUser(bodyUser);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!eventId) {
      return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 });
    }

    if (action === 'accept') {
      // One tap accepts every occurrence when this is a recurring instance
      const { event: acceptedEvent, acceptedCount } = await acceptEventOrSeries(eventId);
      const isSeries = !!acceptedEvent?.seriesId && acceptedCount > 1;

      // Sync to Google Calendar for the user who accepted
      if (acceptedEvent && user) {
        const dateStr = acceptedEvent.date.toISOString().split('T')[0]; // YYYY-MM-DD
        const googleEventId = await createCalendarEvent(user, {
          title: acceptedEvent.title,
          date: dateStr,
          endDate: acceptedEvent.endDate ? acceptedEvent.endDate.toISOString().split('T')[0] : null,
          time: acceptedEvent.time,
          endTime: acceptedEvent.endTime,
          notes: acceptedEvent.notes,
          category: acceptedEvent.category,
          allDay: acceptedEvent.allDay,
        });

        if (googleEventId) {
          // Store the Google Calendar event ID for future updates/deletes
          await prisma.calendarEvent.update({
            where: { id: eventId },
            data: { googleEventId },
          });
          console.log(`Google Calendar event created for ${user}: ${googleEventId}`);
        }
      }

      // Sync the rest of the accepted series to Google Calendar too
      if (acceptedEvent?.seriesId && isSeries) {
        await syncSeriesOccurrencesToGoogle(user, acceptedEvent)
          .catch((err: unknown) => console.error("Series Google sync failed:", err));
      }

      // Recalculate streaks after accepting
      const streakResult = await recalculateStreaks();
      const newBadges = streakResult.newUnlocks.map((b) => ({ id: b.id, label: b.label, emoji: b.emoji }));

      // Push notification to creator
      if (acceptedEvent) {
        const couple = await getCoupleContext();
        const accepterDisplay = couple?.name(user) ?? user;
        const cat = getCategoryById(acceptedEvent.category);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        sendPushToUser(acceptedEvent.createdBy, {
          title: `${cat.emoji} Plan Accepted!`,
          body: isSeries
            ? `${accepterDisplay} accepted all ${acceptedCount} occurrences of: ${acceptedEvent.title}`
            : `${accepterDisplay} accepted: ${acceptedEvent.title}`,
          url: `${baseUrl}/`,
        });
      }

      // Notify the original creator that their plan was accepted
      if (acceptedEvent) {
        const couple = await getCoupleContext();
        const creatorEmail = couple?.email(acceptedEvent.createdBy) ?? null;
        const accepterDisplay = couple?.name(user) ?? user;
        const cat = getCategoryById(acceptedEvent.category);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

        if (creatorEmail && process.env.RESEND_API_KEY !== "re_...") {
          resend.emails.send({
            from: "Calendar 🐾 <noreply@yaminami.uk>",
            to: creatorEmail,
            subject: `${cat.emoji} ${acceptedEvent.title} — ${accepterDisplay} accepted! 🎉`,
            html: `
              <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
                <h1 style="color: #5d4037; font-size: 24px;">${accepterDisplay} accepted your plan! 🧶</h1>
                <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
                  <p style="margin: 0; font-size: 14px; color: #5d4037; opacity: 0.8;">${cat.emoji} ${cat.label}</p>
                  <h2 style="margin: 5px 0; color: #5d4037;">${acceptedEvent.title}</h2>
                  <p style="margin: 5px 0;">📅 ${formatDateRange(acceptedEvent.date, acceptedEvent.endDate)}${acceptedEvent.allDay ? " · All day" : ` @ ${acceptedEvent.time}`}</p>
                  ${isSeries ? `<p style="margin: 5px 0; color: #5d4037;">🔁 All ${acceptedCount} occurrences accepted</p>` : ""}
                  ${acceptedEvent.notes ? `<p style="margin: 15px 0; font-style: italic;">"${acceptedEvent.notes}"</p>` : ""}
                </div>
                <a href="${baseUrl}" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Open Calendar 🐾
                </a>
                <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">Sent with love from your shared calendar app.</p>
              </div>
            `,
          }).catch((err: unknown) => console.error("Accept notification email failed:", err));
        }
      }

      return NextResponse.json({
        success: true,
        message: isSeries ? `Accepted all ${acceptedCount} occurrences` : "Event accepted",
        acceptedCount,
        newBadges: newBadges.length > 0 ? newBadges : undefined,
      });
    }

    if (action === 'adjust') {
      const existingEvent = await prisma.calendarEvent.findUnique({
        where: { id: eventId }
      });

      if (!existingEvent) {
        return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
      }

      // Build update data, using new values when provided, keeping originals otherwise
      const updatedTitle = title || existingEvent.title;
      const updatedNotes = adjustNotes !== undefined ? adjustNotes : existingEvent.notes;
      const updatedEndTime = endTime !== undefined ? endTime : existingEvent.endTime;
      const updatedCategory = adjustCategory !== undefined ? adjustCategory : existingEvent.category;
      const updatedAllDay = allDay !== undefined ? allDay : existingEvent.allDay;
      const updatedDate = new Date(date || existingEvent.date);
      const updatedTime = time || existingEvent.time;
      // endDate: undefined = keep, null = clear, string = set
      let updatedEndDate = endDate !== undefined
        ? (endDate ? new Date(endDate) : null)
        : existingEvent.endDate;
      if (updatedEndDate && updatedEndDate <= updatedDate) {
        updatedEndDate = null; // same day or earlier — collapse to single-day
      }

      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          status: 'adjusted',
          date: updatedDate,
          endDate: updatedEndDate,
          time: updatedTime,
          title: updatedTitle,
          notes: updatedNotes,
          endTime: updatedEndTime,
          category: updatedCategory,
          allDay: updatedAllDay,
        }
      });

      const dateStr = updatedDate.toISOString().split('T')[0];
      const endDateStr = updatedEndDate ? updatedEndDate.toISOString().split('T')[0] : null;
      const creator = existingEvent.createdBy;

      // Update Google Calendar for the original creator's event
      if (existingEvent.creatorGoogleEventId) {
        updateCalendarEvent(existingEvent.creatorGoogleEventId, creator, {
          title: updatedTitle,
          date: dateStr,
          endDate: endDateStr,
          time: updatedTime,
          endTime: updatedEndTime,
          notes: updatedNotes,
          category: updatedCategory,
          allDay: updatedAllDay,
        }).then(success => {
          if (success) console.log(`Creator's Google Calendar event updated for ${creator}`);
        }).catch(err => {
          console.error(`Creator's Google Calendar update failed for ${creator}:`, err);
        });
      }

      // Update Google Calendar for the accepter's event if it exists
      if (existingEvent.googleEventId) {
        const accepter = user || (creator === "Wife" ? "Husband" : "Wife");
        updateCalendarEvent(existingEvent.googleEventId, accepter, {
          title: updatedTitle,
          date: dateStr,
          endDate: endDateStr,
          time: updatedTime,
          endTime: updatedEndTime,
          notes: updatedNotes,
          category: updatedCategory,
          allDay: updatedAllDay,
        }).then(success => {
          if (success) console.log(`Accepter's Google Calendar event updated for ${accepter}`);
        }).catch(err => {
          console.error(`Accepter's Google Calendar update failed for ${accepter}:`, err);
        });
      }

      // Send email notification to the original event creator
      const adjustCouple = await getCoupleContext();
      const adjusterDisplayName = user ? (adjustCouple?.name(user) ?? user) : "Your partner";
      const originalCreator = existingEvent.createdBy;
      const recipientEmail = adjustCouple?.email(originalCreator) ?? null;
      const cat = getCategoryById(updatedCategory);

      if (recipientEmail && process.env.RESEND_API_KEY !== "re_...") {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        try {
          // Build a detailed list of changes for the email
          const changes: string[] = [];
          if (title && title !== existingEvent.title) {
            changes.push(`<li>📝 Title: <strong>${existingEvent.title}</strong> → <strong style="color:#e91e63;">${title}</strong></li>`);
          }
          if (date || time) {
            const oldDateStr = existingEvent.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            const newDateStr = updatedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            if (oldDateStr !== newDateStr || existingEvent.time !== updatedTime) {
              changes.push(`<li>📅 Date/Time: <strong>${oldDateStr} @ ${existingEvent.time}</strong> → <strong style="color:#e91e63;">${newDateStr} @ ${updatedTime}</strong></li>`);
            }
          }
          if (adjustNotes !== undefined && adjustNotes !== existingEvent.notes) {
            changes.push(`<li>💬 Notes updated to: <em>"${adjustNotes || 'none'}"</em></li>`);
          }
          if (endTime !== undefined && endTime !== existingEvent.endTime) {
            changes.push(`<li>⏰ End Time: <strong>${existingEvent.endTime || 'not set'}</strong> → <strong style="color:#e91e63;">${endTime || 'not set'}</strong></li>`);
          }
          const oldEnd = existingEvent.endDate ? existingEvent.endDate.getTime() : null;
          const newEnd = updatedEndDate ? updatedEndDate.getTime() : null;
          if (oldEnd !== newEnd) {
            changes.push(`<li>📆 ${updatedEndDate
              ? `Now spans <strong style="color:#e91e63;">${formatDateRange(updatedDate, updatedEndDate)}</strong>`
              : `No longer multi-day — single day <strong style="color:#e91e63;">${updatedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>`}</li>`);
          }

          const changesHtml = changes.length > 0 
            ? `<ul style="padding: 0; list-style: none; margin: 15px 0;">${changes.join('')}</ul>`
            : '<p style="margin: 15px 0;">View the updated plan in your calendar.</p>';

          await resend.emails.send({
            from: 'Calendar 🐾 <noreply@yaminami.uk>',
            to: recipientEmail,
            subject: `${cat.emoji} ${updatedTitle} — ${adjusterDisplayName} proposed changes!`,
            html: `
              <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
                <h1 style="color: #5d4037; font-size: 24px;">Meow! ${adjusterDisplayName} wants to adjust the plan 🐾</h1>

                <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
                  <p style="margin: 0; font-size: 14px; color: #5d4037; opacity: 0.8;">${cat.emoji} ${cat.label} — Changes proposed:</p>
                  <h2 style="margin: 5px 0; color: #5d4037;">${updatedTitle}</h2>
                  ${changesHtml}
                  ${updatedNotes ? `<p style="margin: 15px 0; font-style: italic; color: #5d4037;">"Meow Notes: ${updatedNotes}"</p>` : ''}
                </div>

                <div style="margin-top: 20px;">
                  <a href="${eventActionUrl(baseUrl, eventId, originalCreator)}" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
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

    if (action === 'edit') {
      const existingEvent = await prisma.calendarEvent.findUnique({
        where: { id: eventId }
      });

      if (!existingEvent) {
        return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
      }

      const updatedTitle = title || existingEvent.title;
      const updatedNotes = adjustNotes !== undefined ? adjustNotes : existingEvent.notes;
      const updatedEndTime = endTime !== undefined ? endTime : existingEvent.endTime;
      const updatedCategory = adjustCategory !== undefined ? adjustCategory : existingEvent.category;
      const updatedDate = date ? new Date(date) : existingEvent.date;
      const updatedTime = time || existingEvent.time;
      const updatedAllDay = allDay !== undefined ? allDay : existingEvent.allDay;
      // endDate: undefined = keep, null = clear, string = set
      let updatedEndDate = endDate !== undefined
        ? (endDate ? new Date(endDate) : null)
        : existingEvent.endDate;
      if (updatedEndDate && updatedEndDate <= updatedDate) {
        updatedEndDate = null;
      }
      // specialDateId: undefined = keep, null = unlink, string = link
      const updatedSpecialDateId = specialDateId !== undefined
        ? (specialDateId || null)
        : existingEvent.specialDateId;
      // personTag: undefined = keep, null = clear, string = set
      const updatedPersonTag = personTag !== undefined
        ? (personTag || null)
        : existingEvent.personTag;

      // Update the event — keep status as 'accepted'
      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          title: updatedTitle,
          date: updatedDate,
          endDate: updatedEndDate,
          time: updatedTime,
          endTime: updatedEndTime,
          notes: updatedNotes,
          category: updatedCategory,
          allDay: updatedAllDay,
          specialDateId: updatedSpecialDateId,
          personTag: updatedPersonTag,
        },
      });

      const dateStr = updatedDate.toISOString().split('T')[0];
      const endDateStr = updatedEndDate ? updatedEndDate.toISOString().split('T')[0] : null;

      // Sync Google Calendar for both creator and accepter
      if (existingEvent.creatorGoogleEventId) {
        updateCalendarEvent(existingEvent.creatorGoogleEventId, existingEvent.createdBy, {
          title: updatedTitle, date: dateStr, endDate: endDateStr, time: updatedTime,
          endTime: updatedEndTime, notes: updatedNotes, category: updatedCategory, allDay: updatedAllDay,
        }).catch((err: unknown) => console.error("Creator GCal edit failed:", err));
      }
      if (existingEvent.googleEventId) {
        const partner = existingEvent.createdBy === "Wife" ? "Husband" : "Wife";
        updateCalendarEvent(existingEvent.googleEventId, partner, {
          title: updatedTitle, date: dateStr, endDate: endDateStr, time: updatedTime,
          endTime: updatedEndTime, notes: updatedNotes, category: updatedCategory, allDay: updatedAllDay,
        }).catch((err: unknown) => console.error("Partner GCal edit failed:", err));
      }

      // Notify whoever this event is tagged for (both, unless it's tagged
      // exclusively to one partner)
      const editCouple = await getCoupleContext();
      const editorDisplay = editCouple?.name(user) ?? user;
      const cat = getCategoryById(updatedCategory);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const formattedDate = formatDateRange(updatedDate, updatedEndDate);

      const notifyUsers = getEventNotificationRecipients(updatedPersonTag);
      const emailRecipients: string[] = notifyUsers
        .map((u) => editCouple?.email(u))
        .filter(Boolean) as string[];

      if (emailRecipients.length > 0 && process.env.RESEND_API_KEY !== "re_...") {
        const emailHtml = `
          <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
            <h1 style="color: #5d4037; font-size: 24px;">✏️ ${editorDisplay} updated a plan</h1>
            <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
              <p style="margin: 0; font-size: 13px; color: #5d4037; opacity: 0.7;">${cat.emoji} ${cat.label}</p>
              <h2 style="margin: 6px 0; color: #5d4037;">${updatedTitle}</h2>
              <p style="margin: 5px 0;">📅 ${formattedDate} @ ${updatedTime}${updatedEndTime ? ` – ${updatedEndTime}` : ''}</p>
              ${updatedNotes ? `<p style="margin: 14px 0 0; font-style: italic; color: #5d4037;">"${updatedNotes}"</p>` : ''}
            </div>
            <a href="${baseUrl}" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
              Open Calendar 🐾
            </a>
            <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">Sent with love from your shared calendar app.</p>
          </div>
        `;

        resend.emails.send({
          from: 'Calendar 🐾 <noreply@yaminami.uk>',
          to: emailRecipients,
          subject: `${cat.emoji} ${updatedTitle} — updated by ${editorDisplay}`,
          html: emailHtml,
        }).catch((err: unknown) => console.error("Edit notification email failed:", err));
      }

      return NextResponse.json({ success: true, message: "Event updated" });
    }

    if (action === 'delete') {
      // Fetch event to check for Google Calendar events
      const eventToDelete = await prisma.calendarEvent.findUnique({
        where: { id: eventId }
      });

      if (!eventToDelete) {
        return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
      }

      // Delete from Google Calendar (both creator's and accepter's events)
      const deletionPromises: Promise<boolean>[] = [];

      // Delete accepter's Google Calendar event if it was synced
      if (eventToDelete.googleEventId) {
        const accepter = eventToDelete.createdBy === "Wife" ? "Husband" : "Wife";
        deletionPromises.push(
          deleteCalendarEvent(eventToDelete.googleEventId, accepter)
        );
      }

      // Delete creator's Google Calendar event if it was synced
      if (eventToDelete.creatorGoogleEventId) {
        deletionPromises.push(
          deleteCalendarEvent(eventToDelete.creatorGoogleEventId, eventToDelete.createdBy)
        );
      }

      // Wait for all Google Calendar deletions to complete (best effort)
      if (deletionPromises.length > 0) {
        const results = await Promise.allSettled(deletionPromises);
        results.forEach((result, i) => {
          const eventType = i === 0 ? "Accepter's" : "Creator's";
          if (result.status === 'fulfilled' && result.value) {
            console.log(`${eventType} Google Calendar event deleted successfully`);
          } else if (result.status === 'rejected') {
            console.error(`${eventType} Google Calendar delete failed:`, result.reason);
          }
        });
      }

      // Delete from database (regardless of Google Calendar result — best effort).
      // Memories cascade via FK, but their comments/reactions key on targetId
      // strings — clean those up too.
      const memoryIds = await prisma.memory.findMany({
        where: { eventId },
        select: { id: true },
      });
      for (const m of memoryIds) {
        await prisma.comment.deleteMany({ where: { targetType: "memory", targetId: m.id } });
        await prisma.reaction.deleteMany({ where: { targetType: "memory", targetId: m.id } });
      }
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
    const acceptedBy = searchParams.get('user'); // "Wife" or "Husband"

    if (!eventId || action !== 'accept') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // This link is followed from a mail app, where nobody is signed in — so
    // there is no session to take the family from. Two ways in:
    //
    //   a signed link, which proves the request came from an email we sent;
    //   or an ordinary session, for someone already signed in.
    //
    // Without one of them the scoped client has no family and throws, which
    // is what silently broke every accept link once tenancy landed.
    const session = await getSession();
    let scope: string | null = session?.coupleId ?? null;

    if (!scope) {
      if (!verifyEventAction(eventId, action, searchParams.get('sig'))) {
        console.warn('[action] unsigned accept attempt, no session');
        return NextResponse.redirect(new URL('/login', request.url));
      }
      // The signature is the authority; the event says which family.
      const owner = await systemPrisma.calendarEvent.findUnique({
        where: { id: eventId },
        select: { coupleId: true },
      });
      if (!owner) return NextResponse.redirect(new URL('/', request.url));
      scope = owner.coupleId;
    }

    // One click accepts every occurrence when this is a recurring instance
    const { event: acceptedEvent, acceptedCount } = await withCouple(
      scope,
      () => acceptEventOrSeries(eventId),
    );
    const isSeries = !!acceptedEvent?.seriesId && acceptedCount > 1;

    // Sync to Google Calendar for the person who accepted via email link
      if (acceptedEvent && acceptedBy) {
      const dateStr = acceptedEvent.date.toISOString().split('T')[0];
      const googleEventId = await createCalendarEvent(acceptedBy, {
        title: acceptedEvent.title,
        date: dateStr,
        endDate: acceptedEvent.endDate ? acceptedEvent.endDate.toISOString().split('T')[0] : null,
        time: acceptedEvent.time,
        endTime: acceptedEvent.endTime,
        notes: acceptedEvent.notes,
        category: acceptedEvent.category,
        allDay: acceptedEvent.allDay,
      });
      
      if (googleEventId) {
        // Store the Google Calendar event ID for future updates/deletes
        await prisma.calendarEvent.update({
          where: { id: eventId },
          data: { googleEventId },
        });
        console.log(`Google Calendar event created for ${acceptedBy}: ${googleEventId}`);
      }
    }

    // Sync the rest of the accepted series to Google Calendar too (email-link accept)
    if (acceptedBy && acceptedEvent?.seriesId && isSeries) {
      await syncSeriesOccurrencesToGoogle(acceptedBy, acceptedEvent)
        .catch((err: unknown) => console.error("Series Google sync failed:", err));
    }

    await recalculateStreaks();

    // Notify the original creator that their plan was accepted via email link
    if (acceptedEvent && acceptedBy) {
      const getCouple = await getCoupleContext();
      const creatorEmail = getCouple?.email(acceptedEvent.createdBy) ?? null;
      const accepterDisplay = getCouple?.name(acceptedBy) ?? acceptedBy;
      const cat = getCategoryById(acceptedEvent.category);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

      if (creatorEmail && process.env.RESEND_API_KEY !== "re_...") {
        resend.emails.send({
          from: "Calendar 🐾 <noreply@yaminami.uk>",
          to: creatorEmail,
          subject: `${cat.emoji} ${acceptedEvent.title} — ${accepterDisplay} accepted! 🎉`,
          html: `
            <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
              <h1 style="color: #5d4037; font-size: 24px;">${accepterDisplay} accepted your plan! 🧶</h1>
              <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
                <p style="margin: 0; font-size: 14px; color: #5d4037; opacity: 0.8;">${cat.emoji} ${cat.label}</p>
                <h2 style="margin: 5px 0; color: #5d4037;">${acceptedEvent.title}</h2>
                <p style="margin: 5px 0;">📅 ${formatDateRange(acceptedEvent.date, acceptedEvent.endDate)}${acceptedEvent.allDay ? " · All day" : ` @ ${acceptedEvent.time}`}</p>
                ${isSeries ? `<p style="margin: 5px 0; color: #5d4037;">🔁 All ${acceptedCount} occurrences accepted</p>` : ""}
                ${acceptedEvent.notes ? `<p style="margin: 15px 0; font-style: italic;">"${acceptedEvent.notes}"</p>` : ""}
              </div>
              <a href="${baseUrl}" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
                Open Calendar 🐾
              </a>
              <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">Sent with love from your shared calendar app.</p>
            </div>
          `,
        }).catch((err: unknown) => console.error("Accept notification email failed:", err));
      }
    }

    // Redirect to home with a success message
    return NextResponse.redirect(new URL('/?accepted=true', request.url));
  } catch (error) {
    console.error("Action GET Error:", error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
