// Client-safe helpers for showing special dates (anniversaries, birthdays,
// milestones) in pickers and badges. Kept separate from lib/special-dates.ts,
// which imports Prisma and is server-only.

export interface SpecialDateOption {
  id: string;
  title: string;
  emoji?: string | null;
  type?: "annual" | "one-time";
  daysLeft?: number;
}

/**
 * Seeded titles already start with their emoji ("🎂 Budoor's Birthday"), so
 * blindly prefixing emoji again renders "🎂 🎂 Budoor's Birthday".
 */
export function specialDateLabel(sd: SpecialDateOption): string {
  const title = sd.title.trim();
  const emoji = sd.emoji?.trim();
  if (!emoji || title.startsWith(emoji)) return title;
  return `${emoji} ${title}`;
}

/**
 * Options worth offering: recurring dates always apply, but one-off
 * milestones that have already passed are just clutter.
 */
export function linkableSpecialDates<T extends SpecialDateOption>(dates: T[]): T[] {
  return dates.filter((d) => d.type !== "one-time" || (d.daysLeft ?? 0) >= 0);
}
