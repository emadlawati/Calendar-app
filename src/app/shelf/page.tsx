"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Skeleton from "@/components/Skeleton";
import { useSession } from "@/components/SessionProvider";
import { getVolumeInfo, spellDate } from "@/lib/volume";
import { useTheme } from "@/components/ThemeProvider";
import ThemeHero from "@/components/ThemeHero";
import ThemeStreak from "@/components/ThemeStreak";
import ThemeMarks from "@/components/ThemeMarks";

interface Milestone { id: string; label: string; detail?: string; date: string }
interface StatsData {
  totalEvents: number;
  totalMemories: number;
  totalPhotos: number;
  totalNotes: number;
  totalHighlights: number;
  completedBucketItems: number;
  totalBucketItems: number;
  favoriteCategory: { label: string; emoji: string; count: number } | null;
  busiestMonth: { month: string; count: number } | null;
  firstEventDate: string | null;
  milestones: Milestone[];
  streakData: { currentStreak: number; longestStreak: number; weeksKept: number };
}


/** A figure in a bordered box — the brief's block 2. */
function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div className="rr-card" style={{ padding: "18px 16px" }}>
      <p className="rr-display" style={{ fontSize: 38, lineHeight: 1, color: "var(--ink)" }}>{value}</p>
      <p className="mt-1.5" style={{ fontSize: 12.5, color: "var(--muted)" }}>{label}</p>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5"
      style={{ borderTop: "1px solid var(--rule-light)" }}>
      <span className="rr-italic" style={{ fontSize: 15, color: "var(--muted)" }}>{left}</span>
      <span className="rr-italic" style={{ fontSize: 15, color: "var(--ink)", flex: "none" }}>{right}</span>
    </div>
  );
}

const monthName = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

export default function ShelfPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { couple } = useSession();
  const { definition } = useTheme();
  const w = definition.words;
  const vol = getVolumeInfo(couple?.startDate);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const weeksKept = stats?.streakData.weeksKept ?? 0;
  const longest = stats?.streakData.longestStreak ?? 0;
  const milestones = stats?.milestones ?? [];


  // Whether anything has been written since this week began. The current
  // week's mark is the one the streak objects leave open.
  const keptThisWeek = (stats?.streakData.currentStreak ?? 0) > 0;

  const rest: { value: string; label: string }[] = [
    { label: "Memories kept", value: String(stats?.totalMemories ?? 0) },
    { label: "Photographs", value: String(stats?.totalPhotos ?? 0) },
    { label: "Letters", value: String(stats?.totalNotes ?? 0) },
    { label: "Days marked", value: String(stats?.totalHighlights ?? 0) },
    { label: "Wishes crossed off", value: String(stats?.completedBucketItems ?? 0) },
  ];

  return (
    <AppShell active="shelf">
      <header className="pt-5">
        <h1 className="rr-display" style={{ fontSize: 26, color: "var(--ink)" }}>{w.shelf}</h1>
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          {vol.together} {w.shelfSubtitle}
        </p>
      </header>

      {loading ? (
        <div className="mt-7 flex flex-col gap-5">
          <Skeleton className="h-52" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <>
          {/* ── 1. The theme's own object ── */}
          <ThemeHero
            years={vol.years}
            daysIntoYear={vol.daysIntoYear}
            startYear={vol.startYear}
            weeksKept={weeksKept}
          />

          {/* ── 2. Two figures ── */}
          {/* The brief asks for exactly two, as large numerals in bordered
              boxes. The rest of the record follows as ruled rows inside the
              same block rather than as a sixth one — the page is five blocks
              and the brief says never more. */}
          <section className="mt-7">
            <p className="rr-label">The record</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Figure value={vol.years} label={w.figurePeriod} />
              <Figure value={stats?.totalEvents ?? 0} label={w.figureLifetime} />
            </div>

            <div className="mt-5">
              {rest.map((r) => (
                <Row key={r.label} left={r.label} right={r.value} />
              ))}
              {stats?.favoriteCategory && (
                <Row left="Most often" right={`${stats.favoriteCategory.label} · ${stats.favoriteCategory.count}`} />
              )}
              {stats?.busiestMonth && (
                <Row left="Fullest month" right={`${monthName(stats.busiestMonth.month)} · ${stats.busiestMonth.count}`} />
              )}
              {stats?.firstEventDate && (
                <Row left="Earliest entry"
                  right={spellDate(new Date(stats.firstEventDate), { weekday: false, year: true })} />
              )}
            </div>
          </section>

          {/* ── 3. The streak, as this theme's object ── */}
          <ThemeStreak weeksKept={weeksKept} longest={longest} keptThisWeek={keptThisWeek} />

          {/* ── 4. The 4-up grid ── */}
          <ThemeMarks milestones={milestones} />

          <p className="rr-italic text-center mt-10" style={{ fontSize: 15, color: "var(--ghost)" }}>
            {w.closing}
          </p>
          <div style={{ height: 32 }} />
        </>
      )}
    </AppShell>
  );
}
