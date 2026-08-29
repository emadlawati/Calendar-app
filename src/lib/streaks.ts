import prisma from "@/lib/prisma";
import { BADGES, type Badge } from "@/lib/achievements";
import { weekdayIndex } from "./week";

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
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

  const bestEver = Math.max(longestStreak, currentStreak);
  const lastWeekStart = new Date(`${thisWeekStart}T00:00:00.000Z`);

  // find-then-write: the unique key is now (coupleId, userId) and the
  // scoping extension fills in the coupleId half.
  const existingStreak = await prisma.streak.findFirst({ where: { userId: "couple" } });
  if (existingStreak) {
    await prisma.streak.update({
      where: { id: existingStreak.id },
      data: { currentStreak, longestStreak: bestEver, lastWeekStart },
    });
  } else {
    await prisma.streak.create({
      data: { userId: "couple", currentStreak, longestStreak: bestEver, lastWeekStart },
    });
  }

  // Check for newly unlocked achievements. Badges unlock on the best-ever
  // streak — a couple whose 24-week run broke long ago has still earned it.
  const newUnlocks: Badge[] = [];
  for (const badge of BADGES) {
    if (bestEver >= badge.weeksRequired) {
      const existing = await prisma.achievement.findFirst({
        where: { userId: "couple", badgeId: badge.id },
      });
      if (!existing) {
        await prisma.achievement.create({
          data: { userId: "couple", badgeId: badge.id },
        });
        newUnlocks.push(badge);
      }
    }
  }

  return { currentStreak, longestStreak: bestEver, newUnlocks };
}

export async function getStreakData(): Promise<{
  currentStreak: number;
  longestStreak: number;
  achievements: { badgeId: string; unlockedAt: Date }[];
}> {
  // Always recompute — reads used to return stale rows whenever no accept
  // had triggered a recalculation (e.g. weeks with no new activity).
  await recalculateStreaks();
  const streak = await prisma.streak.findFirst({ where: { userId: "couple" } });

  const achievements = await prisma.achievement.findMany({
    where: { userId: "couple" },
    orderBy: { unlockedAt: "asc" },
  });

  return {
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
    achievements: achievements.map((a) => ({
      badgeId: a.badgeId,
      unlockedAt: a.unlockedAt,
    })),
  };
}
