import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma, { systemPrisma, withCouple } from "@/lib/prisma";
import resend from "@/lib/resend";
import { getCategoryById } from "@/lib/categories";
import { pushAndReport } from "@/lib/notify";
import { getEventNotificationRecipients } from "@/lib/people";

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

  const noEmail = process.env.RESEND_API_KEY === "re_..." || !process.env.RESEND_API_KEY;

  // Cron has no session, so it fans out over couples explicitly. systemPrisma
  // is the only unscoped read here; everything inside runs under withCouple().
  const couples = await systemPrisma.couple.findMany({
    select: { id: true, users: { select: { role: true, email: true } } },
  });

  const results: string[] = [];
  for (const couple of couples) {
    const emailByRole = new Map(couple.users.map((u) => [u.role, u.email]));

    /** Who should hear about this event: both partners by default, or just
     *  one if the event is tagged exclusively "wife" or "husband". */
    function recipientsFor(personTag: string | null) {
      const users = getEventNotificationRecipients(personTag);
      return {
        users,
        // Resolved after the push, so only the people it failed to reach
        // are emailed.
        emailsFor: (roles: string[]) =>
          roles.map((r) => emailByRole.get(r)).filter(Boolean) as string[],
      };
    }

    await withCouple(couple.id, () => sendForCouple(recipientsFor, results, noEmail));
  }

  return NextResponse.json({ ok: true, couples: couples.length, sent: results });
}

async function sendForCouple(
  recipientsFor: (personTag: string | null) => {
    users: ("Wife" | "Husband")[];
    emailsFor: (roles: string[]) => string[];
  },
  results: string[],
  noEmail: boolean,
) {
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



  // ── A. Today's reminders ──
  for (const evt of todayEvents) {
    const cat = getCategoryById(evt.category);
    const { users, emailsFor } = recipientsFor(evt.personTag);
    if (users.length === 0) continue;
    const html = `
      <div style="${EMAIL_STYLE}">
        <h1 style="color:#5d4037;font-size:24px;">☕ Today's the day!</h1>
        <div style="background:#fff;padding:24px;border-radius:24px;margin:20px 0;border:1px solid #ffeedb;">
          <p style="margin:0;font-size:13px;color:#5d4037;opacity:0.7;">${cat.emoji} ${cat.label}</p>
          <h2 style="margin:6px 0;color:#5d4037;">${evt.title}</h2>
          <p style="margin:5px 0;">🕐 ${evt.allDay ? "All day" : `@ ${evt.time}${evt.endTime ? ` – ${evt.endTime}` : ""}`}${evt.endDate ? ` · until ${formatDate(evt.endDate.toISOString().split("T")[0])}` : ""}</p>
          ${evt.notes ? `<p style="margin:14px 0 0;font-style:italic;">"${evt.notes}"</p>` : ""}
        </div>
        ${openBtn("Open Calendar 🐾")}
        <p style="margin-top:30px;font-size:12px;opacity:0.6;">Sent with love from your shared calendar app.</p>
      </div>`;
    const delivery = await pushAndReport(users, {
      title: `${cat.emoji} Today: ${evt.title}!`,
      body: evt.allDay ? "All day today" : `Today @ ${evt.time}${evt.endTime ? ` – ${evt.endTime}` : ""}`,
      url: `${BASE_URL}/`,
    });
    const fallback = emailsFor(delivery.needEmail);
    if (!noEmail && fallback.length > 0) {
      await resend.emails.send({
        from: "Calendar 🐾 <noreply@yaminami.uk>",
        to: fallback,
        subject: `${cat.emoji} Today: ${evt.title}! ☕`,
        html,
      }).catch((e: unknown) => console.error("Today reminder email failed:", e));
    }
    results.push(`today:${evt.title}`);
  }

  // ── B. Tomorrow's reminders ──
  for (const evt of tomorrowEvents) {
    const cat = getCategoryById(evt.category);
    const { users, emailsFor } = recipientsFor(evt.personTag);
    if (users.length === 0) continue;
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
    const delivery = await pushAndReport(users, {
      title: `${cat.emoji} Tomorrow: ${evt.title}`,
      body: evt.allDay ? "All day tomorrow" : `Tomorrow @ ${evt.time}${evt.endTime ? ` – ${evt.endTime}` : ""}`,
      url: `${BASE_URL}/`,
    });
    const fallback = emailsFor(delivery.needEmail);
    if (!noEmail && fallback.length > 0) {
      await resend.emails.send({
        from: "Calendar 🐾 <noreply@yaminami.uk>",
        to: fallback,
        subject: `${cat.emoji} Tomorrow: ${evt.title} 🗓️`,
        html,
      }).catch((e: unknown) => console.error("Tomorrow reminder email failed:", e));
    }
    results.push(`tomorrow:${evt.title}`);
  }

  // ── C. What the ledger has on each of you today ──
  //
  // One summary per person rather than one notification per task, and it is
  // sent every day the list is not empty rather than once per task ever.
  // The old behaviour announced a chore on its due date and then went quiet,
  // so a task that sat unfinished for a week was never mentioned again — the
  // opposite of what a reminder is for.
  //
  // The notification carries a fixed tag, so today's replaces yesterday's
  // instead of stacking, and asks to stay in the shade until it is acted on.
  // It also carries the count for the icon badge, which is what keeps the
  // number right while the app is closed.
  const openTasks = await prisma.task.findMany({
    where: {
      completed: false,
      dueDate: { not: null, lte: new Date(`${todayStr}T23:59:59.999Z`) },
    },
    orderBy: { dueDate: "asc" },
  });

  const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);

  for (const role of ["Wife", "Husband"] as const) {
    const mine = openTasks.filter((t) =>
      (getEventNotificationRecipients(t.personTag) as string[]).includes(role),
    );
    if (mine.length === 0) continue;

    const { emailsFor } = recipientsFor(role === "Wife" ? "wife" : "husband");

    const overdue = mine.filter((t) => t.dueDate! < startOfToday).length;
    // The detail, not just a count: the first few titles, so the notification
    // is useful without opening anything.
    const titles = mine.slice(0, 3).map((t) => t.title).join(" · ");
    const more = mine.length > 3 ? ` · and ${mine.length - 3} more` : "";

    const title = mine.length === 1
      ? `📓 Due today: ${mine[0].title}`
      : `📓 ${mine.length} in the ledger today${overdue > 0 ? ` — ${overdue} overdue` : ""}`;

    const delivery = await pushAndReport([role], {
      title,
      body: mine.length === 1
        ? (mine[0].notes ? mine[0].notes.slice(0, 120) : "From the ledger")
        : `${titles}${more}`,
      url: `${BASE_URL}/ledger`,
      tag: "ledger-today",
      sticky: true,
      badgeCount: mine.length,
    });

    const fallback = emailsFor(delivery.needEmail);
    if (!noEmail && fallback.length > 0) {
      await resend.emails.send({
        from: "Calendar 🐾 <noreply@yaminami.uk>",
        to: fallback,
        subject: title.replace(/^📓 /, "📓 "),
        html: `
          <div style="${EMAIL_STYLE}">
            <h1 style="color:#5d4037;font-size:24px;">📓 Today in the ledger</h1>
            <div style="background:#fff;padding:24px;border-radius:24px;margin:20px 0;border:1px solid #ffeedb;">
              ${mine.map((t) => `
                <p style="margin:8px 0;color:#5d4037;">
                  <strong>${t.title}</strong>${t.dueDate! < startOfToday ? ' <span style="color:#b4614a;">— overdue</span>' : ""}
                  ${t.notes ? `<br><span style="font-style:italic;opacity:.75;">${t.notes}</span>` : ""}
                </p>`).join("")}
            </div>
            ${openBtn("Open the ledger 🐾")}
          </div>`,
      }).catch((e: unknown) => console.error("Ledger digest email failed:", e));
    }

    results.push(`ledger:${role}:${mine.length}`);
  }

  // Kept accurate so the column still means "this has been announced", even
  // though the digest no longer gates on it.
  await prisma.task.updateMany({
    where: { id: { in: openTasks.map((t) => t.id) }, notifiedDue: false },
    data: { notifiedDue: true },
  });
}
