import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import resend from "@/lib/resend";
import { reminderDateTime } from "@/lib/reminder-utils";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const EMAIL_STYLE = `
  font-family: sans-serif;
  background-color: #fdfbf7;
  padding: 40px;
  border-radius: 32px;
  color: #5d4037;
  border: 2px solid #d7ccc8;
`;

function openBtn(label = "Open Calendar 🐾") {
  return `<a href="${BASE_URL}" style="background-color:#fce4ec;color:#5d4037;padding:12px 24px;border-radius:20px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:20px;">${label}</a>`;
}

async function sendWhatsApp(body: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, WIFE_PHONE, HUSBAND_PHONE } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) return;

  const phones = [WIFE_PHONE, HUSBAND_PHONE].filter(Boolean) as string[];
  if (phones.length === 0) return;

  try {
    // Dynamic import so the server bundle doesn't fail if twilio isn't installed
    const twilio = (await import("twilio")).default;
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    for (const phone of phones) {
      await client.messages
        .create({
          from: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
          to: `whatsapp:${phone}`,
          body,
        })
        .catch((e: unknown) => console.error("WhatsApp send failed:", e));
    }
  } catch (e) {
    console.error("Twilio import/send error:", e);
  }
}

export async function GET(request: Request) {
  // Security: same CRON_SECRET used by the daily cron
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const recipients = [process.env.WIFE_EMAIL, process.env.HUSBAND_EMAIL].filter(Boolean) as string[];
  const noEmail = process.env.RESEND_API_KEY === "re_..." || !process.env.RESEND_API_KEY;

  const now = Date.now();
  const results: string[] = [];

  // ── Fetch all un-sent reminders ──
  const pending = await prisma.reminder.findMany({
    where: {
      OR: [{ sent24h: false }, { sent1h: false }],
    },
  });

  for (const reminder of pending) {
    const dt = reminderDateTime(reminder.date, reminder.time).getTime();
    const minsUntil = (dt - now) / 60000;

    // ── 24-hour alert: within [22h, 26h] from now ──
    if (!reminder.sent24h && minsUntil >= 22 * 60 && minsUntil <= 26 * 60) {
      const html = `
        <div style="${EMAIL_STYLE}">
          <h1 style="color:#5d4037;font-size:24px;">🔔 Reminder tomorrow!</h1>
          <div style="background:#fff;padding:24px;border-radius:24px;margin:20px 0;border:1px solid #ffeedb;">
            <h2 style="margin:6px 0;color:#5d4037;">${reminder.title}</h2>
            <p style="margin:5px 0;">🕐 Tomorrow at ${reminder.time}${reminder.endTime ? ` – ${reminder.endTime}` : ""}</p>
          </div>
          ${openBtn()}
          <p style="margin-top:30px;font-size:12px;opacity:0.6;">Sent with love from your shared calendar app.</p>
        </div>`;

      if (!noEmail && recipients.length > 0) {
        await resend.emails.send({
          from: "Calendar 🐾 <noreply@yaminami.uk>",
          to: recipients,
          subject: `🔔 Reminder tomorrow: ${reminder.title} at ${reminder.time}`,
          html,
        }).catch((e: unknown) => console.error("24h reminder email failed:", e));
      }

      await sendWhatsApp(`🔔 Reminder tomorrow: ${reminder.title} at ${reminder.time}`);

      await prisma.reminder.update({ where: { id: reminder.id }, data: { sent24h: true } });
      results.push(`24h:${reminder.title}`);
    }

    // ── 1-hour alert: within [0, 90] minutes from now ──
    if (!reminder.sent1h && minsUntil >= 0 && minsUntil <= 90) {
      const html = `
        <div style="${EMAIL_STYLE}">
          <h1 style="color:#5d4037;font-size:24px;">🔔 In 1 hour!</h1>
          <div style="background:#fff;padding:24px;border-radius:24px;margin:20px 0;border:1px solid #ffeedb;">
            <h2 style="margin:6px 0;color:#5d4037;">${reminder.title}</h2>
            <p style="margin:5px 0;">🕐 At ${reminder.time}${reminder.endTime ? ` – ${reminder.endTime}` : ""}</p>
          </div>
          ${openBtn()}
          <p style="margin-top:30px;font-size:12px;opacity:0.6;">Sent with love from your shared calendar app.</p>
        </div>`;

      if (!noEmail && recipients.length > 0) {
        await resend.emails.send({
          from: "Calendar 🐾 <noreply@yaminami.uk>",
          to: recipients,
          subject: `🔔 In 1 hour: ${reminder.title}! ☕`,
          html,
        }).catch((e: unknown) => console.error("1h reminder email failed:", e));
      }

      await sendWhatsApp(`🔔 In 1 hour: ${reminder.title} at ${reminder.time} ☕`);

      await prisma.reminder.update({ where: { id: reminder.id }, data: { sent1h: true } });
      results.push(`1h:${reminder.title}`);
    }
  }

  return NextResponse.json({ ok: true, checked: pending.length, sent: results });
}
