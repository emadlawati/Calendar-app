// Couple level system — computed from activity score, no schema change needed

export interface LevelInfo {
  level: number;
  title: string;
  emoji: string;
  minScore: number;
  maxScore: number; // exclusive upper bound (Infinity for last level)
}

export const LEVELS: LevelInfo[] = [
  { level: 1,  title: "Brewing Beginners",  emoji: "☕",    minScore: 0,    maxScore: 30    },
  { level: 2,  title: "Date Night Duo",     emoji: "🕯️",   minScore: 30,   maxScore: 75    },
  { level: 3,  title: "Cosy Couple",        emoji: "🧣",    minScore: 75,   maxScore: 150   },
  { level: 4,  title: "Latte Legends",      emoji: "🫶",    minScore: 150,  maxScore: 250   },
  { level: 5,  title: "Adventure Pair",     emoji: "🏔️",   minScore: 250,  maxScore: 400   },
  { level: 6,  title: "Memory Makers",      emoji: "📸",    minScore: 400,  maxScore: 600   },
  { level: 7,  title: "Streak Stars",       emoji: "⭐",    minScore: 600,  maxScore: 850   },
  { level: 8,  title: "Espresso Experts",   emoji: "⚡",    minScore: 850,  maxScore: 1150  },
  { level: 9,  title: "Soulmates",          emoji: "❤️‍🔥", minScore: 1150, maxScore: 1500  },
  { level: 10, title: "Legendary Duo",      emoji: "👑",    minScore: 1500, maxScore: Infinity },
];

export interface LevelResult {
  level: number;
  title: string;
  emoji: string;
  score: number;
  /** Score needed to reach next level (same as score if already max level) */
  nextLevelScore: number;
  /** Progress 0–1 within current level band */
  progress: number;
}

/**
 * Score formula:
 *   totalEvents * 3 + totalMemories * 5 + completedBucketItems * 4 + totalNotes * 1
 */
export function computeScore(
  totalEvents: number,
  totalMemories: number,
  completedBucketItems: number,
  totalNotes: number,
): number {
  return totalEvents * 3 + totalMemories * 5 + completedBucketItems * 4 + totalNotes;
}

export function computeLevel(score: number): LevelResult {
  const info = LEVELS.findLast((l) => score >= l.minScore) ?? LEVELS[0];
  const nextLevelScore = info.maxScore === Infinity ? info.minScore : info.maxScore;
  const bandSize = info.maxScore === Infinity ? 1 : info.maxScore - info.minScore;
  const progress = info.maxScore === Infinity ? 1 : Math.min((score - info.minScore) / bandSize, 1);
  return {
    level: info.level,
    title: info.title,
    emoji: info.emoji,
    score,
    nextLevelScore,
    progress,
  };
}
