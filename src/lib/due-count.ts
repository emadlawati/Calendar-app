import prisma from "./prisma";
import { getEventNotificationRecipients } from "./people";

/**
 * How many open tasks are on one person today.
 *
 * One definition, used by the badge endpoint, the daily digest and the push
 * sent when a task is assigned. It was previously written out at each site,
 * and the assignment push simply forgot to carry it — so a task added during
 * the day never reached the other person's icon. They saw a notification and
 * a clean icon, which is exactly the wrong way round.
 *
 * Overdue counts as today. A chore that went past on Friday is still on you on
 * Saturday, and a count that dropped it would be quietly saying you were
 * finished when you were not.
 *
 * Must be called inside a tenant scope.
 */
export async function dueTodayCountFor(role: string): Promise<number> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });

  const rows = await prisma.task.findMany({
    where: { completed: false, dueDate: { not: null, lte: new Date(`${today}T23:59:59.999Z`) } },
    select: { personTag: true },
  });

  // personTag holds "wife"/"husband"/"family"/a child's id; only the first two
  // narrow a task to one person, so the filter cannot be done in the query.
  return rows.filter((t) =>
    (getEventNotificationRecipients(t.personTag) as string[]).includes(role),
  ).length;
}
