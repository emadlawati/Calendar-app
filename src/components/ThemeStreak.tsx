"use client";

import { useTheme } from "./ThemeProvider";

/**
 * Block 3 of the stats page: the streak, as an object rather than a number.
 *
 * The brief replaces streak counters with "a row or list of week marks:
 * earned, current, not-yet" — a borrower's card that gets stamped, a roast
 * that deepens, a month of moon phases. This was the piece most obviously
 * missing: every theme showed the same 40px numeral.
 *
 * The "not-yet" mark is the current week, which is genuinely undecided rather
 * than a target: it fills in on its own if anything gets written. Nothing here
 * counts down to something withheld, which was the objection to the old badge
 * system, and nothing is lost by not filling it.
 */
export default function ThemeStreak({
  weeksKept,
  longest,
  keptThisWeek,
}: {
  weeksKept: number;
  longest: number;
  keptThisWeek: boolean;
}) {
  const { theme, definition } = useTheme();
  const w = definition.words;

  // ── Reading Room: the borrower's card ──────────────────────────────
  // Ruled rows with a date-stamp box in the right column, the way a library
  // card is stamped on each loan.
  if (theme === "reading-room") {
    const priorLabel = weeksKept <= 1 ? "the first week" : `weeks 1 — ${Math.max(1, weeksKept - (keptThisWeek ? 1 : 0))}`;
    const rows: { label: string; mark: "stamped" | "open" | "blank" }[] = [
      { label: priorLabel, mark: weeksKept > (keptThisWeek ? 1 : 0) ? "stamped" : "blank" },
      { label: "this week", mark: keptThisWeek ? "stamped" : "open" },
      { label: "next week", mark: "blank" },
    ];
    return (
      <Card label={w.weeksKeptLabel} count={weeksKept} longest={longest}>
        <div className="mt-4">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4"
              style={{ borderTop: "1px solid var(--rule-light)", padding: "11px 0" }}>
              <span className="rr-italic" style={{ fontSize: 15.5, color: "var(--muted)" }}>{r.label}</span>
              {r.mark === "stamped" ? (
                // Stamps: text in a 1px terracotta box, 10px, .18em, uppercase.
                <span style={{
                  border: "1px solid var(--terracotta)", color: "var(--terracotta)",
                  fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase",
                  padding: "3px 7px", fontFamily: "var(--font-ui)", flex: "none",
                }}>
                  Stamped
                </span>
              ) : r.mark === "open" ? (
                <span style={{
                  border: "1px dashed var(--rule-strong)", color: "var(--faint)",
                  fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase",
                  padding: "3px 7px", fontFamily: "var(--font-ui)", flex: "none",
                }}>
                  Open
                </span>
              ) : (
                <span style={{ color: "var(--ghost)", fontSize: 12, letterSpacing: ".3em", flex: "none" }}>———</span>
              )}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // ── Coffee & Matcha: the roast ─────────────────────────────────────
  // Five blocks going tan → crema → espresso, filled as far as the weeks
  // reach, with a marker under the block currently reached.
  if (theme === "coffee") {
    const ROASTS = ["Green", "Light", "Medium", "Full", "Dark"];
    const NOTE = ["just started", "finding it", "steady", "well in", "long habit"];
    const SHADES = ["var(--tint)", "var(--sage-pale)", "var(--sage-light)", "var(--sage)", "var(--ink)"];
    // Five blocks over a run that is open-ended, so each block is a few weeks.
    const level = Math.min(4, Math.floor(weeksKept / 3));
    return (
      <Card label={w.weeksKeptLabel} count={weeksKept} longest={longest}>
        <div className="mt-5">
          <div className="flex gap-1.5">
            {SHADES.map((shade, i) => (
              <div key={i} className="flex-1" style={{
                height: 30, borderRadius: 6,
                background: i <= level ? shade : "transparent",
                border: i <= level ? "none" : "1.5px dashed var(--rule)",
              }} />
            ))}
          </div>
          <div className="flex gap-1.5" aria-hidden>
            {SHADES.map((_, i) => (
              <div key={i} className="flex-1 text-center" style={{
                fontSize: 10, lineHeight: 1, marginTop: 5,
                color: i === level ? "var(--gold)" : "transparent",
              }}>
                ▲
              </div>
            ))}
          </div>
          <p className="rr-display text-right mt-2" style={{ fontSize: 15, color: "var(--ink)" }}>
            {ROASTS[level]} — {NOTE[level]}
          </p>
        </div>
      </Card>
    );
  }

  // ── Observatory: moon phases ───────────────────────────────────────
  // Eight marks across: the weeks behind you lit, this week an open ring
  // waiting on tonight, next week dashed because it has not come.
  const lit = Math.min(6, Math.max(0, weeksKept - (keptThisWeek ? 1 : 0)));
  const phases = Array.from({ length: 8 }, (_, i) =>
    i < lit ? "lit" : i === 6 ? "open" : i === 7 ? "waiting" : "dark",
  );
  return (
    <Card label={w.weeksKeptLabel} count={weeksKept} longest={longest}>
      <div className="flex items-center justify-between gap-2 mt-5">
        {phases.map((p, i) => (
          <span key={i} style={{
            width: 26, height: 26, borderRadius: "999px", flex: "none",
            background: p === "lit" ? "var(--gold)" : "transparent",
            border:
              p === "open" ? "1px solid var(--rule-strong)"
              : p === "waiting" ? "1px dashed var(--rule-strong)"
              : p === "dark" ? "1px solid var(--rule-light)"
              : "none",
          }} />
        ))}
      </div>
      <p className="mt-4" style={{ fontSize: 12, color: "var(--faint)" }}>
        tonight is not counted yet
      </p>
    </Card>
  );
}

/**
 * The shared shell. The brief wants one object per theme, not one layout per
 * theme — the heading, the figure and the run-so-far line are the same in all
 * three, and only the marks below them change.
 */
function Card({
  label,
  count,
  longest,
  children,
}: {
  label: string;
  count: number;
  longest: number;
  children: React.ReactNode;
}) {
  const { definition } = useTheme();
  return (
    <section className="mt-9 rr-card p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="rr-label">{label}</p>
        <p className="rr-display" style={{ fontSize: 30, lineHeight: 1, color: "var(--ink)" }}>{count}</p>
      </div>
      <p className="rr-italic mt-2" style={{ fontSize: 15, color: "var(--muted)" }}>
        {count === 0 ? "nothing kept yet — there is no wrong week to start" : definition.words.weeksKeptLine}
      </p>
      {children}
      {longest > 1 && (
        <p className="mt-4" style={{ fontSize: 13, color: "var(--faint)" }}>
          Longest run so far, {longest} weeks in a row — kept as a record, not a thing to defend.
        </p>
      )}
    </section>
  );
}
