import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import resend from "@/lib/resend";
import { getCategoryById } from "@/lib/categories";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const EMAIL_STYLE = `
  font-family: sans-serif;
  background-color: #fdfbf7;
  padding: 40px;
  border-radius: 32px;
  color: #5d4037;
  border: 2px solid #d7ccc8;
`;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function openBtn(label = "Open Calendar 🐾") {
  return `<a href="${BASE_URL}" style="background-color:#fce4ec;color:#5d4037;padding:12px 24px;border-radius:20px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:20px;">${label}</a>`;
}

/** Returns "YYYY-MM-DD" in Muscat timezone */
function mscDateStr(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });
}

export async function GET(request: Request) {
  // Security: Vercel sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const recipients = [process.env.WIFE_EMAIL, process.env.HUSBAND_EMAIL].filter(Boolean) as string[];
  if (recipients.length === 0) {
    return NextResponse.json({ skipped: "No email recipients configured" });
  }

  const noEmail = process.env.RESEND_API_KEY === "re_..." || !process.env.RESEND_API_KEY;

  const todayStr = mscDateStr(0);
  const tomorrowStr = mscDateStr(1);

  // Parse as UTC midnight so Prisma date range works correctly
  const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
  const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);
  const tomorrowStart = new Date(`${tomorrowStr}T00:00:00.000Z`);
  const tomorrowEnd = new Date(`${tomorrowStr}T23:59:59.999Z`);

  // Parallel queries
  const [todayEvents, tomorrowEvents] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { status: "accepted", archived: false, date: { gte: todayStart, lte: todayEnd } },
      orderBy: { time: "asc" },
    }),
    prisma.calendarEvent.findMany({
      where: { status: "accepted", archived: false, date: { gte: tomorrowStart, lte: tomorrowEnd } },
      orderBy: { time: "asc" },
    }),
  ]);

  const results: string[] = [];

  // ── A. Today's reminders ──
  for (const evt of todayEvents) {
    const cat = getCategoryById(evt.category);
    const html = `
      <div style="${EMAIL_STYLE}">
        <h1 style="color:#5d4037;font-size:24px;">☕ Today's the day!</h1>
        <div style="background:#fff;padding:24px;border-radius:24px;margin:20px 0;border:1px solid #ffeedb;">
          <p style="margin:0;font-size:13px;color:#5d4037;opacity:0.7;">${cat.emoji} ${cat.label}</p>
          <h2 style="margin:6px 0;color:#5d4037;">${evt.title}</h2>
          <p style="margin:5px 0;">🕐 ${evt.allDay ? "All day" : `@ ${evt.time}${evt.endTime ? ` – ${evt.endTime}` : ""}`}${evt.endDate ? ` · until ${formatDate(evt.endDate.toISOString().split("T")[0])} 🧳` : ""}</p>
          ${evt.notes ? `<p style="margin:14px 0 0;font-style:italic;">"${evt.notes}"</p>` : ""}
        </div>
        ${openBtn("Open Calendar 🐾")}
        <p style="margin-top:30px;font-size:12px;opacity:0.6;">Sent with love from your shared calendar app.</p>
      </div>`;
    if (!noEmail) {
      await resend.emails.send({
        from: "Calendar 🐾 <noreply@yaminami.uk>",
        to: recipients,
        subject: `${cat.emoji} Today: ${evt.title}! ☕`,
        html,
      }).catch((e: unknown) => console.error("Today reminder email failed:", e));
    }
    results.push(`today:${evt.title}`);
  }

  // ── B. Tomorrow's reminders ──
  for (const evt of tomorrowEvents) {
    const cat = getCategoryById(evt.category);
    const html = `
      <div style="${EMAIL_STYLE}">
        <h1 style="color:#5d4037;font-size:24px;">🗓️ Tomorrow!</h1>
        <div style="background:#fff;padding:24px;border-radius:24px;margin:20px 0;border:1px solid #ffeedb;">
          <p style="margin:0;font-size:13px;color:#5d4037;opacity:0.7;">${cat.emoji} ${cat.label}</p>
          <h2 style="margin:6px 0;color:#5d4037;">${evt.title}</h2>
          <p style="margin:5px 0;">📅 ${formatDate(tomorrowStr)} @ ${evt.allDay ? "All day" : evt.time}${evt.endDate ? ` · until ${formatDate(evt.endDate.toISOString().split("T")[0])} 🧳` : ""}</p>
          ${evt.notes ? `<p style="margin:14px 0 0;font-style:italic;">"${evt.notes}"</p>` : ""}
        </div>
        ${openBtn("Open Calendar 🐾")}
        <p style="margin-top:30px;font-size:12px;opacity:0.6;">Sent with love from your shared calendar app.</p>
      </div>`;
    if (!noEmail) {
      await resend.emails.send({
        from: "Calendar 🐾 <noreply@yaminami.uk>",
        to: recipients,
        subject: `${cat.emoji} Tomorrow: ${evt.title} 🗓️`,
        html,
      }).catch((e: unknown) => console.error("Tomorrow reminder email failed:", e));
    }
    results.push(`tomorrow:${evt.title}`);
  }

  // ── C. Sunday weekly digest ──
  const isSunday = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Muscat", weekday: "long" }) === "Sunday";
  if (isSunday) {
    const weekEnd = new Date(`${mscDateStr(7)}T23:59:59.999Z`);
    const weekEvents = await prisma.calendarEvent.findMany({
      where: {
        status: "accepted",
        archived: false,
        date: { gte: todayStart, lte: weekEnd },
      },
      orderBy: { date: "asc" },
    });

    let bodyHtml: string;
    if (weekEvents.length === 0) {
      bodyHtml = `<p style="font-size:16px;margin:20px 0;">Nothing planned this week — time to brew something? ☕</p>
        <a href="${BASE_URL}" style="background-color:#fce4ec;color:#5d4037;padding:12px 24px;border-radius:20px;text-decoration:none;font-weight:bold;display:inline-block;">Plan something 🐾</a>`;
    } else {
      const rows = weekEvents.map((evt) => {
        const cat = getCategoryById(evt.category);
        const dStr = new Date(evt.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
          + (evt.endDate ? ` – ${new Date(evt.endDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}` : "");
        return `<div style="padding:12px 0;border-bottom:1px solid #f5e6d8;">
          <p style="margin:0;font-size:13px;opacity:0.7;">${cat.emoji} ${dStr} ${evt.allDay ? "· All day" : `@ ${evt.time}`}</p>
          <p style="margin:4px 0 0;font-weight:600;font-size:15px;">${evt.title}</p>
        </div>`;
      }).join("");
      bodyHtml = `<p style="font-size:15px;margin:0 0 16px;">Here's what you have planned this week:</p>${rows}${openBtn()}`;
    }

    const html = `<div style="${EMAIL_STYLE}"><h1 style="color:#5d4037;font-size:24px;">☕ Your week ahead</h1>${bodyHtml}<p style="margin-top:30px;font-size:12px;opacity:0.6;">Sent with love from your shared calendar app.</p></div>`;

    if (!noEmail) {
      await resend.emails.send({
        from: "Calendar 🐾 <noreply@yaminami.uk>",
        to: recipients,
        subject: weekEvents.length ? `☕ This week: ${weekEvents.map((e) => e.title).join(", ")}` : "☕ Nothing planned this week — brew something?",
        html,
      }).catch((e: unknown) => console.error("Weekly digest email failed:", e));
    }
    results.push(`digest:${weekEvents.length} events`);
  }

  return NextResponse.json({ ok: true, sent: results });
}
