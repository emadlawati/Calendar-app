import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import resend from '@/lib/resend';
import { createCalendarEvent } from '@/lib/google-calendar';
import { getRequestUser } from '@/lib/auth';
import { getDisplayName } from '@/lib/names';
import { getCategoryById } from '@/lib/categories';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, date, time, endTime, notes, category, allDay, createdBy: bodyCreatedBy } = body;

    const createdBy = await getRequestUser(bodyCreatedBy);
    if (!createdBy) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Save event to database
    const newEvent = await prisma.calendarEvent.create({
      data: {
        title,
        date: new Date(date),
        time,
        endTime: endTime || null,
        notes,
        category: category || "other",
        allDay: allDay || false,
        createdBy,
        status: "pending"
      }
    });

    // Sync to the creator's Google Calendar immediately
    const dateStr = new Date(date).toISOString().split('T')[0];
    const creatorGoogleEventId = await createCalendarEvent(createdBy, {
      title,
      date: dateStr,
      time,
      endTime: endTime || null,
      notes: notes || null,
      category: category || "other",
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
        await resend.emails.send({
          from: 'Calendar 🐾 <noreply@yaminami.uk>',
          to: partnerEmail,
          subject: `${cat.emoji} New Plan from ${displayName}: ${title}!`,
          html: `
            <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
              <h1 style="color: #5d4037; font-size: 24px;">${cat.emoji} ${displayName} wants to plan something with you 🐾</h1>
               
              <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
                <p style="margin: 0; font-size: 14px; color: #5d4037; opacity: 0.8;">${cat.label} — The Plan:</p>
                <h2 style="margin: 5px 0; color: #5d4037;">${title}</h2>
                <p style="margin: 5px 0;">📅 ${new Date(date).toLocaleDateString()} @ ${time}</p>
                ${notes ? `<p style="margin: 15px 0; font-style: italic; color: #5d4037;">"Meow Notes: ${notes}"</p>` : ''}
              </div>

              <div style="display: flex; gap: 10px; margin-top: 20px;">
                <a href="${baseUrl}/api/events/action?id=${newEvent.id}&action=accept&user=${partnerName}" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Meow Accept 🧶
                </a>
                <a href="${adjustUrl}" style="background-color: #d7ccc8; color: #ffffff; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block; margin-left: 10px;">
                  Propose Adjustment 🐾
                </a>
              </div>

              <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">Sent with love from your shared calendar app.</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error("Email failed but event was saved:", emailError);
      }
    }

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

