import prisma from "@/lib/prisma";
import { BADGES, type Badge } from "@/lib/achievements";
import { weekdayIndex } from "./week";

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  /** Weeks with something kept, counted once each and never given back. */
  weeksKept: number;
  /** Always empty now; badges were retired. Kept so callers still compile. */
  newUnlocks: Badge[];
}

const TZ = "Asia/Muscat";

/** Calendar date (YYYY-MM-DD) as experienced in Muscat. */
function muscatDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/**
 * Week-start (YYYY-MM-DD) for a YYYY-MM-DD date string, using the same
 * definition as the calendar grid — otherwise "this week" on the borrower's
 * card would span different days from the row the calendar draws.
 * All arithmetic stays in UTC so results never depend on server timezone.
 */
function weekStartOf(dateStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  d.setUTCDate(d.getUTCDate() - weekdayIndex(d.getUTCDay()));
  return d.toISOString().split("T")[0];
}

function previousWeek(weekStr: string): string {
  const [y, m, day] = weekStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().split("T")[0];
}

export async function recalculateStreaks(): Promise<StreakResult> {
  const acceptedEvents = await prisma.calendarEvent.findMany({
    where: { status: "accepted", archived: false },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  // Bucket by Muscat calendar week — a Sunday-evening date in the Gulf must
  // not leak into the previous UTC week.
  const weekStarts = new Set<string>();
  for (const e of acceptedEvents) {
    weekStarts.add(weekStartOf(muscatDateStr(new Date(e.date))));
  }

  const sortedWeeks = Array.from(weekStarts).sort().reverse();

  const thisWeekStart = weekStartOf(muscatDateStr(new Date()));

  // Count consecutive weeks from this week backwards. The 104-iteration cap
  // guards runaway loops; a couple celebrating 2+ solid years can re-earn it.
  let currentStreak = 0;
  let checkWeek = thisWeekStart;
  while (weekStarts.has(checkWeek) && currentStreak < 104) {
    currentStreak++;
    checkWeek = previousWeek(checkWeek);
  }

  // Longest streak: walk through all weeks (oldest → newest)
  let longestStreak = 0;
  let run = 0;
  let expectNext: string | null = null;
  for (let i = sortedWeeks.length - 1; i >= 0; i--) {
    if (expectNext !== null && sortedWeeks[i] === expectNext) {
      run++;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    expectNext = previousWeek(sortedWeeks[i]);
  }

  // The headline figure: every week they kept something, counted once and
  // never taken back. A consecutive streak resets on a single missed week,
  // which turns a record of a life into something you can fail at — and this
  // app is meant to be opened because you want to, not to protect a number.
  const weeksKept = weekStarts.size;

  const bestEver = Math.max(longestStreak, currentStreak);
  const lastWeekStart = new Date(`${thisWeekStart}T00:00:00.000Z`);

  // find-then-write: the unique key is now (coupleId, userId) and the
  // scoping extension fills in the coupleId half.
  const existingStreak = await prisma.streak.findFirst({ where: { userId: "couple" } });
  if (existingStreak) {
    await prisma.streak.update({
      where: { id: existingStreak.id },
      data: { currentStreak, longestStreak: bestEver, weeksKept, lastWeekStart },
    });
  } else {
    await prisma.streak.create({
      data: { userId: "couple", currentStreak, longestStreak: bestEver, weeksKept, lastWeekStart },
    });
  }

  // Badges are gone. They were named for a coffee theme two redesigns ago —
  // "Latte Legend" for a 24-week run — and nothing displays them now. The
  // loop that wrote them ran one query per badge on every read of the stats.
  return { currentStreak, longestStreak: bestEver, weeksKept, newUnlocks: [] as Badge[] };
}

export async function getStreakData(): Promise<{
  currentStreak: number;
  longestStreak: number;
  weeksKept: number;
  achievements: { badgeId: string; unlockedAt: Date }[];
}> {
  // Recompute only when the stored row is from an earlier week. Reads used
  // to recalculate unconditionally, which was correct but cost a dozen
  // sequential queries every time the shelf was opened — and under RLS each
  // one is its own transaction. Within the same week the stored answer cannot
  // have gone stale on its own; an accept recalculates it directly.
  let streak = await prisma.streak.findFirst({ where: { userId: "couple" } });
  const thisWeek = weekStartOf(muscatDateStr(new Date()));
  const storedWeek = streak?.lastWeekStart
    ? streak.lastWeekStart.toISOString().split("T")[0]
    : null;
  if (!streak || storedWeek !== thisWeek) {
    await recalculateStreaks();
    streak = await prisma.streak.findFirst({ where: { userId: "couple" } });
  }

  const achievements = await prisma.achievement.findMany({
    where: { userId: "couple" },
    orderBy: { unlockedAt: "asc" },
  });

  return {
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
    weeksKept: streak?.weeksKept ?? 0,
    achievements: achievements.map((a) => ({
      badgeId: a.badgeId,
      unlockedAt: a.unlockedAt,
    })),
  };
}
