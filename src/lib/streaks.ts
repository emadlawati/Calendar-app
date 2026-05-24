import prisma from "@/lib/prisma";
import { BADGES, type Badge } from "@/lib/achievements";
import { startOfWeek, addWeeks } from "date-fns";

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  newUnlocks: Badge[];
}

export async function recalculateStreaks(): Promise<StreakResult> {
  const acceptedEvents = await prisma.calendarEvent.findMany({
    where: { status: "accepted", archived: false },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  const weekStarts = new Set<string>();
  for (const e of acceptedEvents) {
    const monday = startOfWeek(new Date(e.date), { weekStartsOn: 1 });
    weekStarts.add(monday.toISOString().split("T")[0]);
  }

  const sortedWeeks = Array.from(weekStarts)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeekMonday = startOfWeek(today, { weekStartsOn: 1 });

  // Count consecutive weeks from this week backwards
  let currentStreak = 0;
  let checkWeek = thisWeekMonday;

  for (let i = 0; i < 104; i++) {
    const weekStr = checkWeek.toISOString().split("T")[0];
    if (weekStarts.has(weekStr)) {
      currentStreak++;
      checkWeek = addWeeks(checkWeek, -1);
    } else {
      break;
    }
  }

  // Longest streak: walk through all weeks
  let longestStreak = 0;
  if (sortedWeeks.length > 0) {
    let run = 1;
    longestStreak = 1;
    for (let i = 1; i < sortedWeeks.length; i++) {
      const expected = addWeeks(sortedWeeks[i - 1], -1);
      if (sortedWeeks[i].toISOString().split("T")[0] === expected.toISOString().split("T")[0]) {
        run++;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 1;
      }
    }
  }

  const now = new Date();

  // Update streak record
  await prisma.streak.upsert({
    where: { userId: "couple" },
    update: {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastWeekStart: thisWeekMonday,
    },
    create: {
      userId: "couple",
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastWeekStart: thisWeekMonday,
    },
  });

  // Check for newly unlocked achievements
  const newUnlocks: Badge[] = [];
  for (const badge of BADGES) {
    if (currentStreak >= badge.weeksRequired) {
      const existing = await prisma.achievement.findUnique({
        where: { userId_badgeId: { userId: "couple", badgeId: badge.id } },
      });
      if (!existing) {
        await prisma.achievement.create({
          data: { userId: "couple", badgeId: badge.id },
        });
        newUnlocks.push(badge);
      }
    }
  }

  return { currentStreak, longestStreak, newUnlocks };
}

export async function getStreakData(): Promise<{
  currentStreak: number;
  longestStreak: number;
  achievements: { badgeId: string; unlockedAt: Date }[];
}> {
  let streak = await prisma.streak.findUnique({ where: { userId: "couple" } });
  if (!streak) {
    const result = await recalculateStreaks();
    streak = await prisma.streak.findUnique({ where: { userId: "couple" } });
  }

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
