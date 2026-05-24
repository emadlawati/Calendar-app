import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateInstances } from "@/lib/recurring";
import { createCalendarEvent } from "@/lib/google-calendar";
import resend from "@/lib/resend";
import { getDisplayName } from "@/lib/names";
import { getCategoryById } from "@/lib/categories";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, date, time, endTime, notes, category, allDay, createdBy, frequency } = body;

    if (!frequency || frequency === "once") {
      return NextResponse.json({ error: "Frequency is required for recurring events" }, { status: 400 });
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const series = await prisma.recurringSeries.create({
      data: {
        title,
        notes: notes || null,
        category: category || "other",
        allDay: allDay || false,
        time: time || "00:00",
        endTime: endTime || null,
        createdBy,
        frequency,
        startDate,
        generatedUntil: startDate,
        status: "active",
      },
    });

    const count = await generateInstances(
      series.id,
      title,
      startDate,
      time || "00:00",
      endTime || null,
      notes || null,
      category || "other",
      allDay || false,
      createdBy,
      frequency,
    );

    // Sync first instance to creator's Google Calendar
    const firstInstance = await prisma.calendarEvent.findFirst({
      where: { seriesId: series.id, isRecurringInstance: true },
      orderBy: { date: "asc" },
    });

    if (firstInstance) {
      const dateStr = new Date(firstInstance.date).toISOString().split("T")[0];
      const googleEventId = await createCalendarEvent(createdBy, {
        title,
        date: dateStr,
        time: time || "00:00",
        endTime: endTime || null,
        notes,
        category,
      });

      if (googleEventId) {
        await prisma.calendarEvent.update({
          where: { id: firstInstance.id },
          data: { creatorGoogleEventId: googleEventId },
        });
      }

      // Send email for first upcoming instance
      const partner = createdBy === "Wife" ? "Husband" : "Wife";
      const recipientEmail = partner === "Wife" ? process.env.WIFE_EMAIL : process.env.HUSBAND_EMAIL;
      const cat = getCategoryById(category);

      if (recipientEmail && process.env.RESEND_API_KEY !== "re_...") {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        try {
          await resend.emails.send({
            from: "Calendar 🐾 <noreply@yaminami.uk>",
            to: recipientEmail,
            subject: `${cat.emoji} ${title} — ${getDisplayName(createdBy)} invited you (weekly!)`,
            html: `
              <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8;">
                <h1 style="color: #5d4037; font-size: 24px;">Meow! ${getDisplayName(createdBy)} wants to make this a regular thing 🐾</h1>
                <div style="background-color: #ffffff; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid #ffeedb;">
                  <p style="margin: 0; font-size: 14px; color: #5d4037; opacity: 0.8;">${cat.emoji} ${cat.label} · Every ${frequency}</p>
                  <h2 style="margin: 5px 0; color: #5d4037;">${title}</h2>
                  <p style="margin: 5px 0; color: #5d4037;">${dateStr} @ ${time || "00:00"}</p>
                </div>
                <div style="margin-top: 20px;">
                  <a href="${baseUrl}/api/events/action?id=${firstInstance.id}&action=accept&user=${partner}" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Meow Accept 🧶
                  </a>
                </div>
                <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">${count} events created for the next year!</p>
              </div>
            `,
          });
        } catch (e) {
          console.error("Recurring email failed:", e);
        }
      }
    }

    return NextResponse.json({ success: true, seriesId: series.id, instanceCount: count });
  } catch (error) {
    console.error("Recurring create error:", error);
    return NextResponse.json({ error: "Failed to create recurring event" }, { status: 500 });
  }
}
