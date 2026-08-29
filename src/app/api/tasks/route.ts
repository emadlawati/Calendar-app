import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCoupleContext } from "@/lib/couple-context";
import { pushAndReport, emailConfigured } from "@/lib/notify";
import { getEventNotificationRecipients } from "@/lib/people";
import resend from "@/lib/resend";
import { isFrequency, nextDueOnOrAfter, dayStart } from "@/lib/tasks";
import type { User } from "@/lib/types";

/** A due date is a day, so it is stored at midnight UTC like every other one. */
function parseDueDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const t = Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(t) ? null : new Date(t);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [tasks, series] = await Promise.all([
      prisma.task.findMany({
        // Undated tasks sort last; among dated ones the soonest comes first.
        orderBy: [{ completed: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      }),
      prisma.taskSeries.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({ tasks, series });
  } catch (error) {
    console.error("Ledger fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch the ledger" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
    if (!title) return NextResponse.json({ error: "A task needs a title" }, { status: 400 });

    const personTag = typeof body.personTag === "string" && body.personTag ? body.personTag : null;
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null;

    // A repeating chore is a series plus its first occurrence. Only ever one
    // open task exists per series; finishing it creates the next.
    if (isFrequency(body.frequency)) {
      const schedule = {
        frequency: body.frequency,
        weekday: Number.isInteger(body.weekday) ? body.weekday : null,
        monthDay: Number.isInteger(body.monthDay) ? body.monthDay : null,
      };
      const series = await prisma.taskSeries.create({
        data: { title, notes, personTag, createdBy: user, ...schedule },
      });
      const due = nextDueOnOrAfter(schedule, parseDueDate(body.dueDate) ?? new Date());
      const task = await prisma.task.create({
        data: { title, notes, personTag, dueDate: due, createdBy: user, seriesId: series.id },
      });
      await notifyAssignment(task, user);
      return NextResponse.json({ task, series }, { status: 201 });
    }

    const task = await prisma.task.create({
      data: { title, notes, personTag, dueDate: parseDueDate(body.dueDate), createdBy: user },
    });
    await notifyAssignment(task, user);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Ledger create error:", error);
    return NextResponse.json({ error: "Failed to add the task" }, { status: 500 });
  }
}

/**
 * Tell whoever the task is for — unless that is only the person who wrote it,
 * who does not need telling about their own list.
 */
export async function notifyAssignment(
  task: { id: string; title: string; personTag: string | null; dueDate: Date | null },
  author: string,
) {
  const recipients = getEventNotificationRecipients(task.personTag).filter((r) => r !== author);
  if (recipients.length === 0) return;

  const couple = await getCoupleContext();
  const authorName = couple?.name(author) ?? author;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const when = task.dueDate
    ? ` — due ${dayStart(task.dueDate).toISOString().slice(0, 10)}`
    : "";

  const delivery = await pushAndReport(recipients as User[], {
    title: `📓 ${authorName} added something for you`,
    body: `${task.title}${when}`,
    url: `${base}/ledger`,
  });

  const fallback = couple?.emails(delivery.needEmail) ?? [];
  if (!emailConfigured() || fallback.length === 0) return;

  await resend.emails
    .send({
      from: "Calendar 🐾 <noreply@yaminami.uk>",
      to: fallback,
      subject: `📓 ${authorName} added a task for you`,
      html: `
        <div style="font-family:sans-serif;background:#F7F5EC;padding:40px;color:#2E3B2A;">
          <h1 style="font-size:22px;">${authorName} added something to the ledger</h1>
          <div style="background:#fff;padding:20px;margin:16px 0;border:1px solid #DCD8C6;">
            <h2 style="margin:4px 0;">${task.title}</h2>
            ${task.dueDate ? `<p style="margin:6px 0;">Due ${dayStart(task.dueDate).toISOString().slice(0, 10)}</p>` : ""}
          </div>
          <a href="${base}/ledger" style="background:#C9A227;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block;">Open the ledger</a>
        </div>`,
    })
    .catch((e: unknown) => console.error("Task assignment email failed:", e));
}
