"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import BookGlyph from "@/components/BookGlyph";
import ThemeToggle from "@/components/ThemeToggle";
import CoupleSettings from "@/components/CoupleSettings";
import NotificationSettings from "@/components/NotificationSettings";
import Skeleton from "@/components/Skeleton";
import { useSession } from "@/components/SessionProvider";
import { getVolumeInfo } from "@/lib/volume";

interface StatsData {
  totalEvents: number;
  totalMemories: number;
  totalPhotos: number;
  totalNotes: number;
  completedBucketItems: number;
  streakData: { currentStreak: number; longestStreak: number; achievements: { badgeId: string }[] };
}

/** Spine colours cycle; heights vary so the shelf reads as real books. */
const SPINE_COLOURS = ["var(--sage-light)", "var(--terracotta)", "var(--gold)", "var(--sage-light)", "var(--sage)"];
const SPINE_HEIGHTS = [96, 84, 92, 78, 88, 82, 94, 86];
const SHELF_SLOTS = 8;

export default function ShelfPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { couple } = useSession();
  const vol = getVolumeInfo(couple?.startDate);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const streak = stats?.streakData.currentStreak ?? 0;
  const entries = stats?.totalEvents ?? 0;
  const bound = stats?.totalMemories ?? 0;

  // Bookplates replace named badges — plain marks of what has actually happened.
  const plates = [
    { caption: "First", earned: entries >= 1 },
    { caption: "10th", earned: entries >= 10 },
    { caption: "50th", earned: entries >= 50 },
    { caption: "100th", earned: entries >= 100 },
    { caption: "Bound", earned: bound >= 1 },
    { caption: "6 wks", earned: streak >= 6 },
    { caption: "1 vol", earned: vol.volumesBound >= 1 },
  ].filter((p) => p.earned);

  const filledSpines = Math.min(vol.volume, SHELF_SLOTS);

  return (
    <AppShell active="shelf">
      <header className="pt-5">
        <h1 className="rr-display" style={{ fontSize: 26, color: "var(--ink)" }}>Our Shelf</h1>
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          every month you keep something, a volume is bound
        </p>
      </header>

      {loading ? (
        <div className="mt-7 flex flex-col gap-5">
          <Skeleton className="h-56" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          {/* ── 1. The shelf ── */}
          <section className="mt-7" style={{ background: "var(--green-deep)", padding: "22px 20px 0" }}>
            <p className="rr-label" style={{ color: "var(--sage-pale)" }}>
              Volume {vol.volumeRoman} · {new Date().getFullYear()}
            </p>
            <p className="rr-italic mt-1.5" style={{ fontSize: 19, color: "var(--paper)" }}>
              Being bound now
            </p>
            <p style={{ fontSize: 12.5, color: "var(--sage-pale)", marginTop: 6 }}>
              {vol.pagesInVolume.toLocaleString()} pages · {vol.pagesRemaining.toLocaleString()} more and it closes
            </p>

            {/* Spines */}
            <div className="flex items-end gap-1.5 mt-6" style={{ height: 96 }}>
              {Array.from({ length: SHELF_SLOTS }).map((_, i) => {
                const filled = i < filledSpines;
                return (
                  <div
                    key={i}
                    className="flex-1"
                    style={{
                      height: SPINE_HEIGHTS[i],
                      background: filled ? SPINE_COLOURS[i % SPINE_COLOURS.length] : "rgba(247,245,236,.16)",
                      borderTop: filled
                        ? "4px solid var(--gold)"
                        : "2px dashed rgba(247,245,236,.4)",
                    }}
                  />
                );
              })}
            </div>
            {/* Shelf edge — bled past the card padding */}
            <div style={{ height: 7, background: "var(--gold)", margin: "0 -20px" }} />
          </section>

          {/* ── 2. Two figures ── */}
          <section className="mt-6 grid grid-cols-2 gap-4">
            <div className="rr-card px-4 py-5">
              <p className="rr-display" style={{ fontSize: 31, lineHeight: 1, color: "var(--ink)" }}>
                {vol.volumesBound}
              </p>
              <p className="rr-label mt-2">{vol.volumesBound === 1 ? "Volume bound" : "Volumes bound"}</p>
            </div>
            <div className="rr-card px-4 py-5">
              <p className="rr-display" style={{ fontSize: 31, lineHeight: 1, color: "var(--ink)" }}>
                {entries}
              </p>
              <p className="rr-label mt-2">Entries written</p>
            </div>
          </section>

          {/* ── 3. Borrower's card ── */}
          <section className="mt-6 rr-card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="rr-label">Borrower&apos;s card</p>
              <p className="rr-italic" style={{ fontSize: 14, color: "var(--muted)" }}>
                {couple?.displayName ?? " "}
              </p>
            </div>

            <div className="mt-4">
              {(streak > 1
                ? [
                    { label: `week 1 — ${streak - 1}`, mark: "Stamped" },
                    { label: "this week", mark: "Stamped" },
                    { label: "next week", mark: null },
                  ]
                : streak === 1
                  ? [
                      { label: "this week", mark: "Stamped" },
                      { label: "next week", mark: null },
                      { label: "the week after", mark: null },
                    ]
                  : [
                      { label: "this week", mark: null },
                      { label: "next week", mark: null },
                      { label: "the week after", mark: null },
                    ]
              ).map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 py-3"
                  style={{ borderTop: "1px solid var(--rule-light)" }}
                >
                  <span className="rr-italic" style={{ fontSize: 16, color: "var(--ink)" }}>{row.label}</span>
                  {row.mark ? (
                    <span className="rr-stamp">{row.mark}</span>
                  ) : (
                    <span className="rr-meta" style={{ color: "var(--ghost)", letterSpacing: ".3em" }}>———</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── 4. Bookplates ── */}
          <section className="mt-6">
            <p className="rr-label">Bookplates earned</p>
            <div className="grid grid-cols-4 gap-3 mt-3">
              {plates.map((p) => (
                <div
                  key={p.caption}
                  className="flex flex-col items-center justify-center gap-2"
                  style={{ border: "1px solid var(--rule)", aspectRatio: "1 / 1", background: "var(--card)" }}
                >
                  <BookGlyph size={20} />
                  <span
                    className="rr-meta"
                    style={{ fontSize: 8, letterSpacing: ".1em", color: "var(--faint)" }}
                  >
                    {p.caption.toUpperCase()}
                  </span>
                </div>
              ))}
              <div
                className="flex items-center justify-center"
                style={{ border: "1px dashed var(--rule-strong)", aspectRatio: "1 / 1" }}
              >
                <span className="rr-display" style={{ fontSize: 22, color: "var(--ghost)" }}>?</span>
              </div>
            </div>
          </section>

          {/* ── 5. Closing line ── */}
          <p className="rr-italic text-center mt-9" style={{ fontSize: 16, color: "var(--muted)" }}>
            no points, no levels — a library you can walk into
          </p>

          {/* Settings live quietly at the foot of the shelf */}
          <div
            className="mt-10 pt-6 flex items-center justify-between gap-4"
            style={{ borderTop: "1px solid var(--rule)" }}
          >
            <span className="rr-label">Reading light</span>
            <ThemeToggle />
          </div>

          <CoupleSettings />
          <NotificationSettings />
        </>
      )}
    </AppShell>
  );
}
