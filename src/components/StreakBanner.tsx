"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { getBadgeById } from "@/lib/achievements";
import type { StreakData } from "@/lib/types";

export default function StreakBanner({ streak }: { streak: StreakData | null }) {
  if (!streak || streak.currentStreak === 0) return null;

  const badges = streak.achievements
    .map((a) => getBadgeById(a.badgeId))
    .filter(Boolean);

  return (
    <div className="w-full flex flex-wrap items-center gap-2">
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold"
        style={{
          background: "rgba(252, 232, 200, 0.15)",
          borderColor: "rgba(252, 232, 200, 0.3)",
        }}
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            filter: ["drop-shadow(0 0 2px rgba(252,232,200,0.3))", "drop-shadow(0 0 6px rgba(252,232,200,0.6))", "drop-shadow(0 0 2px rgba(252,232,200,0.3))"],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Flame size={14} />
        </motion.div>
        <span>
          {streak.currentStreak} {streak.currentStreak === 1 ? "week" : "weeks"} brewing together!
        </span>
      </div>

      {badges.map((badge) => badge && (
        <motion.div
          key={badge.id}
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] font-medium"
          style={{
            background: "rgba(252, 232, 200, 0.2)",
            borderColor: "rgba(252, 232, 200, 0.4)",
          }}
          title={badge.label}
        >
          <span className="text-sm">{badge.emoji}</span>
          <span>{badge.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
