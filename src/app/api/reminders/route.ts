import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import resend from "@/lib/resend";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const EMAIL_STYLE = `
  font-family: sans-serif;
  background-color: #fdfbf7;
  padding: 40px;
  border-radius: 32px;
  color: #5d4037;
  border: 2px solid #d7ccc8;
`;

function formatDate(dateStr: string, time: string) {
  const d = new Date(dateStr);
  const dateLabel = d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  return `${dateLabel} at ${time}`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reminders = await prisma.reminder.findMany({
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Reminders fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, date, time, endTime } = await request.json();

    if (!title || !date || !time) {
      return NextResponse.json({ error: "title, date, and time are required" }, { status: 400 });
    }

    // Store as UTC midnight of the given date
    const dateObj = new Date(`${date}T00:00:00.000Z`);

    const reminder = await prisma.reminder.create({
      data: {
        title,
        date: dateObj,
        time,
        endTime: endTime || null,
        createdBy: user,
      },
    });

    // Send confirmation email to both partners
    const recipients = [process.env.WIFE_EMAIL, process.env.HUSBAND_EMAIL].filter(Boolean) as string[];
    const noEmail = process.env.RESEND_API_KEY === "re_..." || !process.env.RESEND_API_KEY;

    if (!noEmail && recipients.length > 0) {
      const timeDisplay = endTime ? `${time} – ${endTime}` : time;
      const html = `
        <div style="${EMAIL_STYLE}">
          <h1 style="color:#5d4037;font-size:24px;">🔔 Reminder set!</h1>
          <div style="background:#fff;padding:24px;border-radius:24px;margin:20px 0;border:1px solid #ffeedb;">
            <h2 style="margin:6px 0;color:#5d4037;">${title}</h2>
            <p style="margin:5px 0;">📅 ${formatDate(date, timeDisplay)}</p>
          </div>
          <a href="${BASE_URL}" style="background-color:#fce4ec;color:#5d4037;padding:12px 24px;border-radius:20px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:20px;">Open Calendar 🐾</a>
          <p style="margin-top:30px;font-size:12px;opacity:0.6;">You'll get a reminder 24 hours and 1 hour before.</p>
        </div>`;

      await resend.emails.send({
        from: "Calendar 🐾 <noreply@yaminami.uk>",
        to: recipients,
        subject: `🔔 Reminder set: ${title}`,
        html,
      }).catch((e: unknown) => console.error("Reminder confirmation email failed:", e));
    }

    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error("Reminder create error:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}
