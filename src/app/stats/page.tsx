"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBadgeById } from "@/lib/achievements";

interface StatsData {
  totalEvents: number;
  totalMemories: number;
  totalPhotos: number;
  completedBucketItems: number;
  totalBucketItems: number;
  favoriteCategory: { id: string; label: string; emoji: string; count: number } | null;
  categoryBreakdown: { id: string; label: string; emoji: string; count: number; color: string }[];
  eventsByMonth: { month: string; count: number }[];
  firstEventDate: string | null;
  streakData: {
    currentStreak: number;
    longestStreak: number;
    achievements: { badgeId: string; unlockedAt: string }[];
  };
  level: number;
  title: string;
  emoji: string;
  score: number;
  nextLevelScore: number;
  progress: number;
}

function MonthLabel({ month }: { month: string }) {
  const [y, m] = month.split("-");
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short" });
  return <span className="text-[9px] opacity-50">{label}</span>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startDate = new Date(process.env.NEXT_PUBLIC_RELATIONSHIP_START || "2017-01-31");
  const daysTogether = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const maxMonthCount = stats ? Math.max(...stats.eventsByMonth.map((m) => m.count), 1) : 1;
  const maxCatCount = stats?.categoryBreakdown[0]?.count ?? 1;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen max-w-2xl mx-auto px-4 sm:px-8 py-6 pb-16"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--text-soft)" }}>
          <ArrowLeft size={16} />
          Calendar
        </Link>
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
          Our Stats
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-3xl">☕</motion.div>
        </div>
      ) : !stats ? (
        <p className="text-center py-20" style={{ color: "var(--text-soft)" }}>Could not load stats.</p>
      ) : (
        <div className="space-y-5">

          {/* ── Level Hero Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 shadow-xl relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #6b3a1f 0%, #8a4a22 100%)",
              color: "#fce8c8",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 border"
                style={{ background: "rgba(252,232,200,0.15)", borderColor: "rgba(252,232,200,0.3)" }}
              >
                {stats.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-widest opacity-70 mb-0.5">Couple Level {stats.level}</p>
                <p className="text-2xl leading-tight" style={{ fontFamily: "var(--font-caprasimo), cursive" }}>
                  {stats.title}
                </p>
                <p className="text-xs opacity-60 mt-1">{stats.score.toLocaleString()} pts{stats.level < 10 ? ` · ${stats.nextLevelScore - stats.score} to next level` : " · Max level!"}</p>
              </div>
            </div>
            {/* Progress bar */}
            {stats.level < 10 && (
              <div className="mt-4">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(252,232,200,0.2)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(stats.progress * 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: "rgba(252,232,200,0.7)" }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] opacity-50">Lv. {stats.level}</span>
                  <span className="text-[10px] opacity-50">Lv. {stats.level + 1}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Top stat chips ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Dates", value: stats.totalEvents, emoji: "📅" },
              { label: "Memories", value: stats.totalMemories, emoji: "📸" },
              { label: "Photos", value: stats.totalPhotos, emoji: "🖼️" },
            ].map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 border flex flex-col items-center gap-1"
                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
              >
                <span className="text-xl">{s.emoji}</span>
                <span className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-caprasimo), cursive" }}>
                  {s.value.toLocaleString()}
                </span>
                <span className="text-[11px]" style={{ color: "var(--text-soft)" }}>{s.label}</span>
              </motion.div>
            ))}
          </div>

          {/* ── Together since ── */}
          <div
            className="rounded-2xl p-4 border flex items-center gap-4"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            <span className="text-2xl">❤️</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {daysTogether.toLocaleString()} days together
              </p>
              <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                Since 31 January 2017
                {stats.firstEventDate && ` · First app date: ${new Date(stats.firstEventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
              </p>
            </div>
          </div>

          {/* ── Favourite category ── */}
          {stats.favoriteCategory && (
            <div
              className="rounded-2xl p-4 border"
              style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
            >
              <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--text-very)" }}>
                Favourite Category
              </p>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{stats.favoriteCategory.emoji}</span>
                <div>
                  <p className="font-semibold" style={{ color: "var(--text)" }}>{stats.favoriteCategory.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-soft)" }}>{stats.favoriteCategory.count} dates</p>
                </div>
              </div>
              {/* Category breakdown bars */}
              <div className="space-y-2">
                {stats.categoryBreakdown.slice(0, 6).map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span className="text-sm w-5 shrink-0">{cat.emoji}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--input-bg)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((cat.count / maxCatCount) * 100)}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: cat.color || "var(--accent)" }}
                      />
                    </div>
                    <span className="text-[11px] w-6 text-right shrink-0" style={{ color: "var(--text-soft)" }}>{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Monthly activity ── */}
          <div
            className="rounded-2xl p-4 border"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--text-very)" }}>
              Activity — Last 12 Months
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {stats.eventsByMonth.map(({ month, count }) => (
                <div key={month} className="flex flex-col items-center gap-1">
                  <div className="w-full h-12 flex flex-col justify-end rounded-lg overflow-hidden" style={{ background: "var(--input-bg)" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${count === 0 ? 0 : Math.max(15, Math.round((count / maxMonthCount) * 100))}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="w-full rounded-lg"
                      style={{ background: count > 0 ? "var(--accent)" : "transparent", opacity: count > 0 ? 0.75 : 0 }}
                    />
                  </div>
                  <MonthLabel month={month} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Streak ── */}
          {stats.streakData && (
            <div
              className="rounded-2xl p-4 border"
              style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
            >
              <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--text-very)" }}>
                Streaks & Achievements
              </p>
              <div className="flex gap-4 mb-3">
                <div className="flex-1 text-center p-3 rounded-xl" style={{ background: "var(--input-bg)" }}>
                  <p className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-caprasimo), cursive" }}>
                    {stats.streakData.currentStreak}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-soft)" }}>current streak 🔥</p>
                </div>
                <div className="flex-1 text-center p-3 rounded-xl" style={{ background: "var(--input-bg)" }}>
                  <p className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-caprasimo), cursive" }}>
                    {stats.streakData.longestStreak}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-soft)" }}>longest streak 👑</p>
                </div>
              </div>
              {stats.streakData.achievements.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {stats.streakData.achievements.map((a) => {
                    const badge = getBadgeById(a.badgeId);
                    return badge ? (
                      <span key={a.badgeId} className="chip-pill text-xs">
                        {badge.emoji} {badge.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Bucket list ── */}
          {stats.totalBucketItems > 0 && (
            <div
              className="rounded-2xl p-4 border"
              style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
            >
              <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--text-very)" }}>
                Bucket List
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--input-bg)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((stats.completedBucketItems / stats.totalBucketItems) * 100)}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                </div>
                <span className="text-sm font-semibold shrink-0" style={{ color: "var(--text)" }}>
                  {stats.completedBucketItems}/{stats.totalBucketItems}
                </span>
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-soft)" }}>
                {stats.completedBucketItems} date{stats.completedBucketItems !== 1 ? "s" : ""} ticked off the bucket list
              </p>
            </div>
          )}

        </div>
      )}
    </motion.main>
  );
}
