import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma, { systemPrisma, withCouple } from "@/lib/prisma";
import resend from "@/lib/resend";
import { reminderDateTime } from "@/lib/reminder-utils";
import { sendPushToBoth } from "@/lib/webpush";

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

  const noEmail = process.env.RESEND_API_KEY === "re_..." || !process.env.RESEND_API_KEY;

  const now = Date.now();
  const results: string[] = [];

  // No session here, so fan out over couples explicitly and run each one's
  // reminders inside its own scope.
  const couples = await systemPrisma.couple.findMany({
    select: { id: true, users: { select: { email: true } } },
  });

  let checked = 0;
  for (const couple of couples) {
    const recipients = couple.users.map((u) => u.email).filter(Boolean) as string[];
    checked += await withCouple(couple.id, () => runForCouple(recipients, noEmail, now, results));
  }

  return NextResponse.json({ ok: true, couples: couples.length, checked, sent: results });
}

async function runForCouple(
  recipients: string[],
  noEmail: boolean,
  now: number,
  results: string[],
): Promise<number> {
  // ── Fetch this couple's un-sent reminders ──
  const pending = await prisma.reminder.findMany({
    where: {
      OR: [{ sent24h: false }, { sent1h: false }],
    },
  });

  for (const reminder of pending) {
    const dt = reminderDateTime(reminder.date, reminder.time).getTime();
    const minsUntil = (dt - now) / 60000;

    // ── "tomorrow" alert ──
    // The window is wide because the heartbeat driving this is a GitHub
    // Actions schedule, and GitHub throttles those hard on free repos: the
    // configured 10 minutes actually arrives every ~50 on average, with gaps
    // of several hours. A narrow window would simply be stepped over. The
    // sent24h flag keeps it to one send however often the sweep runs.
    if (!reminder.sent24h && minsUntil >= 20 * 60 && minsUntil <= 30 * 60) {
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

      await sendPushToBoth({
        title: `🔔 Reminder tomorrow: ${reminder.title}`,
        body: `Tomorrow at ${reminder.time}${reminder.endTime ? ` – ${reminder.endTime}` : ""}`,
        url: `${BASE_URL}/`,
      }).catch((e: unknown) => console.error("24h reminder push failed:", e));

      await prisma.reminder.update({ where: { id: reminder.id }, data: { sent24h: true } });
      results.push(`24h:${reminder.title}`);
    }

    // ── "soon" alert — same reasoning, so 20 minutes to 2 hours out ──
    if (!reminder.sent1h && minsUntil >= 20 && minsUntil <= 120) {
      // Say how long is actually left rather than always "1 hour", which a
      // wide window would make wrong most of the time.
      const soon = minsUntil < 45
        ? "Soon"
        : minsUntil < 80
          ? "In about an hour"
          : `In about ${Math.round(minsUntil / 60)} hours`;
      const html = `
        <div style="${EMAIL_STYLE}">
          <h1 style="color:#5d4037;font-size:24px;">🔔 ${soon}!</h1>
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
          subject: `🔔 ${soon}: ${reminder.title}! ☕`,
          html,
        }).catch((e: unknown) => console.error("1h reminder email failed:", e));
      }

      await sendWhatsApp(`🔔 ${soon}: ${reminder.title} at ${reminder.time} ☕`);

      await sendPushToBoth({
        title: `🔔 ${soon}: ${reminder.title}`,
        body: `Starting at ${reminder.time}${reminder.endTime ? ` – ${reminder.endTime}` : ""}`,
        url: `${BASE_URL}/`,
      }).catch((e: unknown) => console.error("1h reminder push failed:", e));

      await prisma.reminder.update({ where: { id: reminder.id }, data: { sent1h: true } });
      results.push(`1h:${reminder.title}`);
    }
  }

  return pending.length;
}
