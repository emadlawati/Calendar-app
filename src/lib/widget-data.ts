import prisma, { withCouple, systemPrisma } from "@/lib/prisma";
import { getEventNotificationRecipients } from "@/lib/people";
import { getVolumeInfo, spellTime } from "@/lib/volume";
import { formatHijri } from "@/lib/hijri";
import { computeDaysToDate } from "@/lib/special-dates";
import type { User } from "@/lib/types";

/** Everything a widget might show, gathered in one pass. */
export interface WidgetData {
  familyName: string;
  dateLine: string;
  hijri: string;
  volume: string;
  page: string;
  today: { time: string; title: string; tentative: boolean }[];
  upcoming: { when: string; title: string }[];
  special: { title: string; daysLeft: number } | null;
  streak: number;
}

const TZ = "Asia/Muscat";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

export async function getWidgetData(
  coupleId: string,
  role: string,
  rows: number,
): Promise<WidgetData> {
  const couple = await systemPrisma.couple.findUnique({
    where: { id: coupleId },
    include: { users: true },
  });
  if (!couple) throw new Error("Family not found");

  const now = new Date();
  const todayKey = dayKey(now);
  const start = new Date(`${todayKey}T00:00:00.000Z`);
  const horizon = new Date(start);
  horizon.setUTCDate(horizon.getUTCDate() + 14);

  return withCouple(coupleId, async () => {
    const [events, specials, streak] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          archived: false,
          status: { in: ["accepted", "pending"] },
          OR: [
            { date: { gte: start, lte: horizon } },
            { AND: [{ date: { lte: horizon } }, { endDate: { gte: start } }] },
          ],
        },
        select: {
          title: true, date: true, endDate: true, time: true,
          allDay: true, status: true, personTag: true,
        },
        orderBy: [{ date: "asc" }, { time: "asc" }],
      }),
      prisma.specialDate.findMany({ select: { title: true, date: true, type: true } }),
      // The streak belongs to the couple, not to a person — lib/streaks.ts
      // writes it under the literal "couple". Querying by role found nothing
      // and the widget showed 0 while the shelf showed 6.
      prisma.streak.findFirst({ where: { userId: "couple" }, select: { currentStreak: true } }),
    ]);

    // Same rule as notifications: an entry tagged for one partner is theirs.
    const mine = events.filter((e) =>
      getEventNotificationRecipients(e.personTag).includes(role as User),
    );

    const spansToday = (e: (typeof mine)[number]) => {
      const from = dayKey(e.date);
      const to = e.endDate ? dayKey(e.endDate) : from;
      return from <= todayKey && todayKey <= to;
    };

    const today = mine
      .filter(spansToday)
      .slice(0, rows)
      .map((e) => ({
        time: e.allDay ? "all day" : spellTime(e.time),
        title: e.title,
        tentative: e.status !== "accepted",
      }));

    const upcoming = mine
      .filter((e) => !spansToday(e) && dayKey(e.date) > todayKey)
      .slice(0, rows)
      .map((e) => ({
        when: e.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: TZ }),
        title: e.title,
      }));

    // Annual dates repeat, so the countdown is to the next occurrence.
    const nextSpecial = specials
      .map((d) => ({
        title: d.title,
        daysLeft:
          d.type === "annual"
            ? computeDaysToDate(d.date.getUTCMonth() + 1, d.date.getUTCDate())
            : Math.ceil((d.date.getTime() - start.getTime()) / 86_400_000),
      }))
      .filter((d) => d.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)[0] ?? null;

    const vol = getVolumeInfo(couple.startDate, now.getTime());

    return {
      familyName: couple.displayName,
      dateLine: now.toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long", timeZone: TZ,
      }),
      hijri: formatHijri(now, { offset: couple.hijriOffset, timeZone: couple.timezone }),
      volume: vol.together,
      page: vol.page.toLocaleString(),
      today,
      upcoming,
      special: nextSpecial,
      streak: streak?.currentStreak ?? 0,
    };
  });
}
