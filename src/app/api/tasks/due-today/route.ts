import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getEventNotificationRecipients } from "@/lib/people";

export const dynamic = "force-dynamic";

/**
 * What is on you today, for the badge.
 *
 * Deliberately narrow and cheap: the app calls this on every navigation and
 * on regaining focus, so it returns a count and a handful of titles rather
 * than whole task rows.
 *
 * "Today" is Asia/Muscat, matching the rest of the app, and overdue counts as
 * today — a chore that went past on Friday is still on you on Saturday, and a
 * badge that dropped it would be quietly telling you that you were finished
 * when you were not.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });
  const endOfToday = new Date(`${today}T23:59:59.999Z`);

  const rows = await prisma.task.findMany({
    where: { completed: false, dueDate: { not: null, lte: endOfToday } },
    select: { id: true, title: true, dueDate: true, personTag: true },
    orderBy: { dueDate: "asc" },
  });

  // Assignment is resolved here rather than in the query: personTag holds
  // "wife"/"husband"/"family"/a child's id, and only the first two narrow it
  // to one person.
  const mine = rows.filter((t) => getEventNotificationRecipients(t.personTag).includes(user));

  const startOfToday = new Date(`${today}T00:00:00.000Z`);
  return NextResponse.json({
    count: mine.length,
    overdue: mine.filter((t) => t.dueDate! < startOfToday).length,
    items: mine.slice(0, 5).map((t) => ({
      id: t.id,
      title: t.title,
      overdue: t.dueDate! < startOfToday,
    })),
  });
}
