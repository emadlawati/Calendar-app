import prisma from "@/lib/prisma";
import { startOfDay } from "date-fns";

export interface UpcomingSpecial {
  id: string;
  title: string;
  emoji: string | null;
  kind: string;
  date: Date;
  daysLeft: number;
  type: "annual" | "one-time";
}

export function getNextSpecialDates(dates: UpcomingSpecial[], limit = 3): UpcomingSpecial[] {
  return dates
    .filter(d => d.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, limit);
}

export function computeDaysToDate(month: number, day: number): number {
  const now = startOfDay(new Date());
  const currentYear = now.getFullYear();
  const target = new Date(currentYear, month - 1, day);
  target.setHours(0, 0, 0, 0);

  if (target < now) {
    target.setFullYear(currentYear + 1);
  }

  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getUpcomingSpecialDates(): Promise<UpcomingSpecial[]> {
  const dates = await prisma.specialDate.findMany({ orderBy: { date: "asc" } });
  const now = startOfDay(new Date());

  return dates.map(d => {
    const dateVal = new Date(d.date);
    let daysLeft: number;

    if (d.type === "annual") {
      daysLeft = computeDaysToDate(dateVal.getMonth() + 1, dateVal.getDate());
    } else {
      const target = startOfDay(dateVal);
      daysLeft = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      id: d.id,
      title: d.title,
      emoji: d.emoji,
      kind: d.kind,
      date: new Date(d.date),
      daysLeft,
      type: d.type as "annual" | "one-time",
    };
  });
}


/**
 * Seed a couple's birthdays, anniversary and milestones from their own
 * record. Everything here used to come from NEXT_PUBLIC_* env vars, which
 * meant every couple would have inherited Budoor & Emad's dates.
 *
 * The existence guard is a scoped count, so it is per-couple: couple #2
 * still gets seeded even though couple #1 already has rows.
 */
export async function seedSpecialDates(couple: {
  startDate: Date;
  childName: string | null;
  members: { role: string; name: string; birthday: string | null }[];
}): Promise<void> {
  const existing = await prisma.specialDate.count();
  if (existing > 0) return;

  const rows: {
    title: string; date: Date; type: string; kind: string;
    emoji: string | null; createdBy: string;
  }[] = [];

  /** "MM-DD" -> a date on a fixed year; only month/day matter for annuals. */
  const annual = (mmdd: string) => {
    const [m, d] = mmdd.split("-").map(Number);
    return new Date(Date.UTC(2000, m - 1, d));
  };

  for (const member of couple.members) {
    if (!member.birthday) continue;
    rows.push({
      title: `\u{1F382} ${member.name}'s Birthday`,
      date: annual(member.birthday),
      type: "annual",
      kind: "birthday",
      emoji: "\u{1F382}",
      createdBy: member.role,
    });
  }

  const start = couple.startDate;
  rows.push({
    title: "\u{1F48D} Anniversary",
    date: new Date(Date.UTC(2000, start.getUTCMonth(), start.getUTCDate())),
    type: "annual",
    kind: "anniversary",
    emoji: "\u{1F48D}",
    createdBy: "Wife",
  });

  for (const row of rows) {
    await prisma.specialDate.create({ data: row });
  }

  await addMilestones(start);
}

/** "100 Days Together", "5 Years Together" — counted from the couple's own start. */
async function addMilestones(start: Date): Promise<void> {
  const milestones = [100, 500, 1000, 2000, 3000, 3652];
  const base = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());

  for (const days of milestones) {
    const label = days >= 365 ? `${Math.floor(days / 365)} Years Together` : `${days} Days Together`;
    await prisma.specialDate.create({
      data: {
        title: `\u{1F389} ${label}`,
        date: new Date(base + days * 86_400_000),
        type: "one-time",
        kind: "milestone",
        emoji: "\u{1F389}",
        createdBy: "Wife",
      },
    });
  }
}
