/**
 * When a repeating chore next falls due.
 *
 * All arithmetic is in UTC on date-only values, matching how every other date
 * in this app is stored. Doing it in server-local time is what put Yusr's
 * birthday on the wrong day once already.
 */

export const FREQUENCIES = ["daily", "weekly", "fortnightly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Every day",
  weekly: "Every week",
  fortnightly: "Every fortnight",
  monthly: "Every month",
};

export const isFrequency = (v: unknown): v is Frequency =>
  typeof v === "string" && (FREQUENCIES as readonly string[]).includes(v);

/** Midnight UTC on the same calendar day. */
export function dayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const addDays = (d: Date, n: number) => {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};

/** Last day of the month `d` falls in. */
const daysInMonth = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();

export interface Schedule {
  frequency: string;
  weekday?: number | null;  // 0 = Sunday, matching the app's week
  monthDay?: number | null; // 1-31
}

/**
 * The first due date on or after `from`.
 *
 * Used both to schedule a new series and to find the next one after a chore is
 * ticked off — so "every Tuesday", completed late on a Thursday, lands on the
 * coming Tuesday rather than one already in the past.
 */
export function nextDueOnOrAfter(schedule: Schedule, from: Date): Date {
  const start = dayStart(from);

  switch (schedule.frequency) {
    case "daily":
      return start;

    case "weekly":
    case "fortnightly": {
      const target = schedule.weekday ?? start.getUTCDay();
      const delta = (target - start.getUTCDay() + 7) % 7;
      return addDays(start, delta);
    }

    case "monthly": {
      const wanted = schedule.monthDay ?? start.getUTCDate();
      // A chore set for the 31st still has to happen in February; it lands on
      // the last day rather than skipping the month.
      const inThisMonth = Math.min(wanted, daysInMonth(start));
      const candidate = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), inThisMonth),
      );
      if (candidate >= start) return candidate;

      const nextMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      return new Date(
        Date.UTC(
          nextMonth.getUTCFullYear(),
          nextMonth.getUTCMonth(),
          Math.min(wanted, daysInMonth(nextMonth)),
        ),
      );
    }

    default:
      return start;
  }
}

/**
 * The due date of the occurrence after `completedDue`.
 *
 * Counted from the date the finished one was due, not from today, so a chore
 * done two days late does not quietly shift the whole schedule forward. The
 * exception is a chore finished so late that the next one would already be
 * past — then it moves to the next real occurrence instead of appearing
 * overdue the moment it is created.
 */
export function nextAfter(schedule: Schedule, completedDue: Date, now: Date): Date {
  const base = dayStart(completedDue);
  let candidate: Date;

  switch (schedule.frequency) {
    case "daily":
      candidate = addDays(base, 1);
      break;
    case "weekly":
      candidate = addDays(base, 7);
      break;
    case "fortnightly":
      candidate = addDays(base, 14);
      break;
    case "monthly": {
      const wanted = schedule.monthDay ?? base.getUTCDate();
      const nextMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1));
      candidate = new Date(
        Date.UTC(
          nextMonth.getUTCFullYear(),
          nextMonth.getUTCMonth(),
          Math.min(wanted, daysInMonth(nextMonth)),
        ),
      );
      break;
    }
    default:
      candidate = addDays(base, 1);
  }

  const today = dayStart(now);
  return candidate < today ? nextDueOnOrAfter(schedule, today) : candidate;
}

/** How a task reads in a list: overdue, today, soon, or undated. */
export function bucketFor(dueDate: Date | null, now: Date): "overdue" | "today" | "upcoming" | "someday" {
  if (!dueDate) return "someday";
  const due = dayStart(dueDate).getTime();
  const today = dayStart(now).getTime();
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}
