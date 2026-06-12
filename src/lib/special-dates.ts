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

export async function seedSpecialDates(): Promise<void> {
  const existing = await prisma.specialDate.count();
  if (existing > 0) return;

  const specialDates = [];

  if (process.env.NEXT_PUBLIC_BUDOOR_BIRTHDAY) {
    const [m, d] = process.env.NEXT_PUBLIC_BUDOOR_BIRTHDAY.split("-");
    specialDates.push({
      title: `\u{1F382} Budoor's Birthday`,
      date: new Date(2000, parseInt(m) - 1, parseInt(d)),
      type: "annual",
      kind: "birthday",
      emoji: "\u{1F382}",
      createdBy: "Wife",
    });
  }

  if (process.env.NEXT_PUBLIC_IMAD_BIRTHDAY) {
    const [m, d] = process.env.NEXT_PUBLIC_IMAD_BIRTHDAY.split("-");
    specialDates.push({
      title: `\u{1F382} Imad's Birthday`,
      date: new Date(2000, parseInt(m) - 1, parseInt(d)),
      type: "annual",
      kind: "birthday",
      emoji: "\u{1F382}",
      createdBy: "Husband",
    });
  }

  const anniversaryDate = process.env.NEXT_PUBLIC_ANNIVERSARY_DATE ||
    (process.env.NEXT_PUBLIC_RELATIONSHIP_START ? (() => {
      const d = new Date(process.env.NEXT_PUBLIC_RELATIONSHIP_START);
      return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })() : null);

  if (anniversaryDate) {
    const [m, d] = anniversaryDate.split("-");
    specialDates.push({
      title: "\u{1F48D} Anniversary",
      date: new Date(2000, parseInt(m) - 1, parseInt(d)),
      type: "annual",
      kind: "anniversary",
      emoji: "\u{1F48D}",
      createdBy: "Wife",
    });
  }

  for (const sd of specialDates) {
    await prisma.specialDate.create({ data: sd });
  }

  if (specialDates.length > 0) {
    const [m, d] = (process.env.NEXT_PUBLIC_RELATIONSHIP_START || "2017-01-31").split("-");
    await addMilestones(parseInt(m), parseInt(d));
  }
}

async function addMilestones(month: number, day: number): Promise<void> {
  const milestones = [100, 500, 1000, 2000, 3000, 3652];
  const start = new Date(process.env.NEXT_PUBLIC_RELATIONSHIP_START || "2017-01-31");
  start.setHours(0, 0, 0, 0);

  for (const days of milestones) {
    const milestoneDate = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    const label = days >= 365 ? `${Math.floor(days / 365)} Years Together` : `${days} Days Together`;

    await prisma.specialDate.create({
      data: {
        title: `\u{1F389} ${label}`,
        date: milestoneDate,
        type: "one-time",
        kind: "milestone",
        emoji: "\u{1F389}",
        createdBy: "Wife",
      },
    });
  }
}
