"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Skeleton from "@/components/Skeleton";
import { useSession } from "@/components/SessionProvider";
import { getVolumeInfo, spellDate } from "@/lib/volume";

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

/** Spine colours cycle; heights vary so the shelf reads as real books. */
const SPINE_COLOURS = ["var(--sage-light)", "var(--terracotta)", "var(--gold)", "var(--sage-light)", "var(--sage)"];
const SPINE_HEIGHTS = [96, 84, 92, 78, 88, 82, 94, 86, 90, 80, 93, 85];

const monthName = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

export default function ShelfPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { couple } = useSession();
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
  const shown = showAll ? milestones : milestones.slice(0, 5);

  // One spine per year together — a count that only ever goes up, and never
  // depends on how often anyone opened the app.
  const spines = Math.max(1, Math.min(vol.years + 1, SPINE_HEIGHTS.length));

  const record: { value: string; label: string }[] = [
    { value: String(stats?.totalEvents ?? 0), label: "entries" },
    { value: String(stats?.totalMemories ?? 0), label: "memories kept" },
    { value: String(stats?.totalPhotos ?? 0), label: "photographs" },
    { value: String(stats?.totalNotes ?? 0), label: "letters" },
    { value: String(stats?.totalHighlights ?? 0), label: "days marked" },
    { value: String(stats?.completedBucketItems ?? 0), label: "wishes crossed off" },
  ];

  return (
    <AppShell active="shelf">
      <header className="pt-5">
        <h1 className="rr-display" style={{ fontSize: 26, color: "var(--ink)" }}>Our Shelf</h1>
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          {vol.together} together
        </p>
      </header>

      {loading ? (
        <div className="mt-7 flex flex-col gap-5">
          <Skeleton className="h-52" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <>
          {/* ── 1. A spine for every year ── */}
          <section className="mt-7" style={{ background: "var(--green-deep)", padding: "22px 20px 0" }}>
            <p className="rr-label" style={{ color: "var(--sage-pale)" }}>Since {vol.startYear}</p>
            <p className="rr-display mt-1.5" style={{ fontSize: 26, color: "var(--paper)" }}>
              {vol.years === 0 ? "The first year" : vol.years === 1 ? "One year" : `${vol.years} years`}
            </p>
            <p style={{ fontSize: 12.5, color: "var(--sage-pale)", marginTop: 6 }}>
              {vol.daysIntoYear.toLocaleString()} days into the next
            </p>

            <div className="flex items-end gap-1.5 mt-6" style={{ height: 96 }}>
              {Array.from({ length: spines }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    height: SPINE_HEIGHTS[i % SPINE_HEIGHTS.length],
                    background: SPINE_COLOURS[i % SPINE_COLOURS.length],
                    borderTop: "4px solid var(--gold)",
                  }}
                />
              ))}
            </div>
            <div style={{ height: 7, background: "var(--gold)", margin: "0 -20px" }} />
          </section>

          {/* ── 2. The record ── */}
          <section className="mt-7">
            <p className="rr-label">The record</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-6 mt-4">
              {record.map((r) => (
                <div key={r.label}>
                  <p className="rr-display" style={{ fontSize: 28, lineHeight: 1, color: "var(--ink)" }}>
                    {r.value}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.3 }}>
                    {r.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              {stats?.favoriteCategory && (
                <div className="flex items-baseline justify-between gap-4 py-3"
                  style={{ borderTop: "1px solid var(--rule-light)" }}>
                  <span className="rr-italic" style={{ fontSize: 15.5, color: "var(--muted)" }}>
                    Most often
                  </span>
                  <span className="rr-italic" style={{ fontSize: 15.5, color: "var(--ink)" }}>
                    {stats.favoriteCategory.label} · {stats.favoriteCategory.count}
                  </span>
                </div>
              )}
              {stats?.busiestMonth && (
                <div className="flex items-baseline justify-between gap-4 py-3"
                  style={{ borderTop: "1px solid var(--rule-light)" }}>
                  <span className="rr-italic" style={{ fontSize: 15.5, color: "var(--muted)" }}>Fullest month</span>
                  <span className="rr-italic" style={{ fontSize: 15.5, color: "var(--ink)" }}>
                    {monthName(stats.busiestMonth.month)} · {stats.busiestMonth.count}
                  </span>
                </div>
              )}
              {stats?.firstEventDate && (
                <div className="flex items-baseline justify-between gap-4 py-3"
                  style={{ borderTop: "1px solid var(--rule-light)" }}>
                  <span className="rr-italic" style={{ fontSize: 15.5, color: "var(--muted)" }}>Earliest entry</span>
                  <span className="rr-italic" style={{ fontSize: 15.5, color: "var(--ink)" }}>
                    {spellDate(new Date(stats.firstEventDate), { weekday: false, year: true })}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* ── 3. Weeks kept ── */}
          <section className="mt-9 rr-card p-5">
            <p className="rr-label">Weeks kept</p>
            <p className="rr-display mt-2" style={{ fontSize: 40, lineHeight: 1, color: "var(--ink)" }}>
              {weeksKept}
            </p>
            <p className="rr-italic mt-2" style={{ fontSize: 15, color: "var(--muted)" }}>
              {weeksKept === 0
                ? "nothing kept yet — there is no wrong week to start"
                : "weeks with something written down. This only ever goes up."}
            </p>
            {longest > 1 && (
              <p className="mt-3" style={{ fontSize: 13, color: "var(--faint)" }}>
                Longest run so far, {longest} weeks in a row — kept as a record, not a thing to defend.
              </p>
            )}
          </section>

          {/* ── 4. Milestones ── */}
          <section className="mt-9">
            <p className="rr-label">Milestones</p>
            {milestones.length === 0 ? (
              <p className="rr-italic mt-3" style={{ fontSize: 15, color: "var(--ghost)" }}>
                the first entry will be the first one
              </p>
            ) : (
              <>
                <div className="mt-3">
                  {shown.map((m) => (
                    <div key={m.id} className="flex items-baseline justify-between gap-4 py-3"
                      style={{ borderTop: "1px solid var(--rule-light)" }}>
                      <span className="min-w-0">
                        <span className="rr-italic block" style={{ fontSize: 16, color: "var(--ink)" }}>
                          {m.label}
                        </span>
                        {m.detail && (
                          <span className="block" style={{ fontSize: 13, color: "var(--muted)" }}>{m.detail}</span>
                        )}
                      </span>
                      <span className="rr-meta" style={{ flex: "none", fontSize: 10, color: "var(--faint)" }}>
                        {new Date(m.date).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
                {milestones.length > 5 && (
                  <button className="rr-action mt-3" style={{ fontSize: 12 }} onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Show fewer" : `All ${milestones.length}`}
                  </button>
                )}
              </>
            )}
          </section>

          <p className="rr-italic text-center mt-10" style={{ fontSize: 15, color: "var(--ghost)" }}>
            a record of what happened, not a score
          </p>
          <div style={{ height: 32 }} />
        </>
      )}
    </AppShell>
  );
}
