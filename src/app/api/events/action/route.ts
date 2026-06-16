import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import resend from '@/lib/resend';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';
import { getRequestUser } from '@/lib/auth';
import { getDisplayName } from '@/lib/names';
import { getCategoryById } from '@/lib/categories';
import { recalculateStreaks } from '@/lib/streaks';
import { getBadgeById } from '@/lib/achievements';
import { sendPushToUser } from '@/lib/webpush';

/** "Mar 6" or "Mar 6 → Mar 8" for multi-day events */
function formatDateRange(date: Date, endDate: Date | null): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
  const startStr = date.toLocaleDateString("en-US", opts);
  if (!endDate) return startStr;
  return `${startStr} → ${endDate.toLocaleDateString("en-US", opts)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, date, time, title, notes: adjustNotes, endTime, category: adjustCategory, allDay, user: bodyUser, eventId, endDate } = body;

    const user = await getRequestUser(bodyUser);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!eventId) {
      return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 });
    }

    if (action === 'accept') {
      // Fetch the event to get details for Google Calendar sync
      const acceptedEvent = await prisma.calendarEvent.findUnique({
        where: { id: eventId }
      });

      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { status: 'accepted' }
      });

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

      // Recalculate streaks after accepting
      const streakResult = await recalculateStreaks();
      const newBadges = streakResult.newUnlocks.map((b) => ({ id: b.id, label: b.label, emoji: b.emoji }));

      // Push notification to creator
      if (acceptedEvent) {
        const accepterDisplay = getDisplayName(user);
        const cat = getCategoryById(acceptedEvent.category);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        sendPushToUser(acceptedEvent.createdBy, {
          title: `${cat.emoji} Plan Accepted!`,
          body: `${accepterDisplay} accepted: ${acceptedEvent.title}`,
          url: `${baseUrl}/`,
        });
      }

      // Notify the original creator that their plan was accepted
      if (acceptedEvent) {
        const creatorEmail = acceptedEvent.createdBy === "Wife"
          ? process.env.WIFE_EMAIL
          : process.env.HUSBAND_EMAIL;
        const accepterDisplay = getDisplayName(user);
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
        message: "Event accepted",
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
      const adjusterDisplayName = user ? getDisplayName(user) : "Your partner";
      const originalCreator = existingEvent.createdBy;
      const recipientEmail = originalCreator === "Wife"
        ? process.env.WIFE_EMAIL
        : process.env.HUSBAND_EMAIL;
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
                  <a href="${baseUrl}/api/events/action?id=${eventId}&action=accept&user=${originalCreator}" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
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

      // Send email to BOTH parties
      const editorDisplay = getDisplayName(user);
      const cat = getCategoryById(updatedCategory);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const formattedDate = formatDateRange(updatedDate, updatedEndDate);

      const emailRecipients: string[] = [];
      if (process.env.WIFE_EMAIL) emailRecipients.push(process.env.WIFE_EMAIL);
      if (process.env.HUSBAND_EMAIL) emailRecipients.push(process.env.HUSBAND_EMAIL);

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

      // Delete from database (regardless of Google Calendar result — best effort)
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

    // Fetch the event to get details for Google Calendar sync
    const acceptedEvent = await prisma.calendarEvent.findUnique({
      where: { id: eventId }
    });

    await prisma.calendarEvent.update({
      where: { id: eventId },
      data: { status: 'accepted' }
    });

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

    await recalculateStreaks();

    // Notify the original creator that their plan was accepted via email link
    if (acceptedEvent && acceptedBy) {
      const creatorEmail = acceptedEvent.createdBy === "Wife"
        ? process.env.WIFE_EMAIL
        : process.env.HUSBAND_EMAIL;
      const accepterDisplay = getDisplayName(acceptedBy as "Wife" | "Husband");
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
