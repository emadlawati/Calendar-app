"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getBadgeById } from "@/lib/achievements";
import {
  ArrowLeftIcon,
  CalendarIcon,
  PolaroidIcon,
  CameraIcon,
  LetterIcon,
  HeartIcon,
  FlameIcon,
  CrownIcon,
  CategoryIcons,
  BadgeIcons,
  LevelIcons,
} from "@/components/icons";
import Skeleton from "@/components/Skeleton";

interface StatsData {
  totalEvents: number;
  totalMemories: number;
  totalPhotos: number;
  totalNotes: number;
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
  return <span className="text-[10px] opacity-50">{label}</span>;
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

  // Lazy initializer: Date.now() during render trips the React compiler's
  // purity check, and a days-together counter only needs one value per mount.
  const [startDate] = useState(
    () => new Date(process.env.NEXT_PUBLIC_RELATIONSHIP_START || "2017-01-31"),
  );
  const [daysTogether] = useState(
    () => Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

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
          <ArrowLeftIcon size={16} />
          Calendar
        </Link>
        <h1 className="heading-font text-2xl" style={{ color: "var(--accent)" }}>
          Our Stats
        </h1>
      </div>

      {loading ? (
        <div className="space-y-5" aria-hidden="true">
          <Skeleton className="h-36 rounded-3xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
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
              background: "var(--hero-gradient)",
              color: "var(--hero-text)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border"
                style={{ background: "rgba(252,232,200,0.15)", borderColor: "rgba(252,232,200,0.3)", color: "var(--hero-text)" }}
              >
                {(() => {
                  const LevelIcon = LevelIcons[stats.level];
                  return LevelIcon ? <LevelIcon size={30} /> : <span className="text-3xl">{stats.emoji}</span>;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-widest opacity-70 mb-0.5">Couple Level {stats.level}</p>
                <p className="heading-font text-2xl leading-tight">
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
              { label: "Dates", value: stats.totalEvents, Icon: CalendarIcon },
              { label: "Memories", value: stats.totalMemories, Icon: PolaroidIcon },
              { label: "Photos", value: stats.totalPhotos, Icon: CameraIcon },
              { label: "Notes sent", value: stats.totalNotes, Icon: LetterIcon },
            ].map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 border flex flex-col items-center gap-1"
                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
              >
                <s.Icon size={22} style={{ color: "var(--accent)" }} />
                <span className="heading-font text-2xl" style={{ color: "var(--accent)" }}>
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
            <HeartIcon size={24} style={{ color: "var(--danger)" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {daysTogether.toLocaleString()} days together
              </p>
              <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                Since {startDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
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
                {(() => {
                  const fav = stats.favoriteCategory;
                  const FavIcon = CategoryIcons[fav.id];
                  return FavIcon ? <FavIcon size={28} /> : <span className="text-3xl">{fav.emoji}</span>;
                })()}
                <div>
                  <p className="font-semibold" style={{ color: "var(--text)" }}>{stats.favoriteCategory.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-soft)" }}>{stats.favoriteCategory.count} dates</p>
                </div>
              </div>
              {/* Category breakdown bars */}
              <div className="space-y-2">
                {stats.categoryBreakdown.slice(0, 6).map((cat) => {
                  const BarIcon = CategoryIcons[cat.id];
                  return (
                    <div key={cat.id} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 flex items-center" style={{ color: "var(--text-soft)" }}>
                        {BarIcon ? <BarIcon size={14} /> : null}
                      </span>
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
                  );
                })}
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
                  <p className="heading-font text-2xl" style={{ color: "var(--accent)" }}>
                    {stats.streakData.currentStreak}
                  </p>
                  <p className="text-[11px] flex items-center justify-center gap-1" style={{ color: "var(--text-soft)" }}>
                    <FlameIcon size={12} /> current streak
                  </p>
                </div>
                <div className="flex-1 text-center p-3 rounded-xl" style={{ background: "var(--input-bg)" }}>
                  <p className="heading-font text-2xl" style={{ color: "var(--accent)" }}>
                    {stats.streakData.longestStreak}
                  </p>
                  <p className="text-[11px] flex items-center justify-center gap-1" style={{ color: "var(--text-soft)" }}>
                    <CrownIcon size={12} /> longest streak
                  </p>
                </div>
              </div>
              {stats.streakData.achievements.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {stats.streakData.achievements.map((a) => {
                    const badge = getBadgeById(a.badgeId);
                    const BadgeIcon = BadgeIcons[a.badgeId];
                    return badge ? (
                      <span key={a.badgeId} className="chip-pill text-xs inline-flex items-center gap-1.5">
                        {BadgeIcon ? <BadgeIcon size={13} /> : badge.emoji} {badge.label}
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
