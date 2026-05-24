export interface Badge {
  id: string;
  label: string;
  emoji: string;
  weeksRequired: number;
}

export const BADGES: Badge[] = [
  { id: "brewing_beginner", label: "Brewing Beginner", emoji: "\u2615", weeksRequired: 1 },
  { id: "steady_sipper",   label: "Steady Sipper",    emoji: "\uD83E\uDE96", weeksRequired: 4 },
  { id: "espresso_expert", label: "Espresso Expert",  emoji: "\u26A1", weeksRequired: 12 },
  { id: "latte_legend",    label: "Latte Legend",     emoji: "\uD83D\uDC51", weeksRequired: 24 },
];

export function getBadgeForStreak(streak: number): Badge | null {
  const unlocked = [...BADGES]
    .reverse()
    .find((b) => streak >= b.weeksRequired);
  return unlocked || null;
}

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
