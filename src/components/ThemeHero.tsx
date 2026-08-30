"use client";

import { useTheme } from "./ThemeProvider";

/**
 * The stats page's hero object, in the theme's own metaphor.
 *
 * This is the part a palette swap cannot do: a café that draws book spines is
 * not a café. Reading Room shelves bound volumes, Coffee punches a loyalty
 * card, Observatory draws a constellation — same underlying figure, three
 * different objects.
 *
 * One departure from the brief, deliberate. It draws each object with empty
 * slots waiting to be filled: dashed spines, unpunched circles, unlit stars.
 * That is the "here is what you have not got" idea that the streak and the
 * badge grid were removed for. Every mark here is one that has happened.
 */
export default function ThemeHero({
  years,
  daysIntoYear,
  startYear,
  weeksKept,
}: {
  years: number;
  daysIntoYear: number;
  startYear: number;
  weeksKept: number;
}) {
  const { theme } = useTheme();
  // One mark per completed year. It was years + 1 to include the year in
  // progress, which reads fine on a shelf but drew ten punches on a card that
  // said "9 punched". The year under way is the "days into the next" line.
  const count = Math.max(1, years);

  const label = (text: string) => (
    <p className="rr-label" style={{ color: "var(--sage-pale)" }}>{text}</p>
  );
  const heading = (text: string) => (
    <p className="rr-display mt-1.5" style={{ fontSize: 26, color: "var(--on-dark)" }}>{text}</p>
  );
  const sub = (text: string) => (
    <p style={{ fontSize: 12.5, color: "var(--sage-pale)", marginTop: 6 }}>{text}</p>
  );

  // ── Reading Room: a spine per year, standing on the shelf edge ──
  if (theme === "reading-room") {
    const heights = [96, 84, 92, 78, 88, 82, 94, 86, 90, 80, 93, 85];
    const colours = ["var(--sage-light)", "var(--terracotta)", "var(--gold)", "var(--sage-light)", "var(--sage)"];
    return (
      <section className="mt-7" style={{ background: "var(--green-deep)", padding: "22px 20px 0" }}>
        {label(`Since ${startYear}`)}
        {heading(years === 0 ? "The first volume" : years === 1 ? "One volume bound" : `${years} volumes bound`)}
        {sub(`${daysIntoYear.toLocaleString()} pages into the next`)}
        <div className="flex items-end gap-1.5 mt-6" style={{ height: 96 }}>
          {Array.from({ length: Math.min(count, heights.length) }).map((_, i) => (
            <div key={i} className="flex-1" style={{
              height: heights[i % heights.length],
              background: colours[i % colours.length],
              borderTop: "4px solid var(--gold)",
            }} />
          ))}
        </div>
        <div style={{ height: 7, background: "var(--gold)", margin: "0 -20px" }} />
      </section>
    );
  }

  // ── Coffee & Matcha: the loyalty card, one punch per year ──
  if (theme === "coffee") {
    const punches = Math.min(count, 10);
    return (
      <section className="mt-7" style={{
        background: "var(--green-deep)", padding: 22, borderRadius: "var(--radius-hero, 0)",
      }}>
        <div className="flex items-baseline justify-between gap-3">
          {label("Loyalty card")}
          <span className="rr-label" style={{ color: "var(--sage-light)" }}>No. {String(count).padStart(2, "0")}</span>
        </div>
        {heading(years === 0 ? "First year on the go" : `${years} punched`)}
        {sub(`${daysIntoYear.toLocaleString()} days into the next round`)}
        <div className="grid grid-cols-5 gap-3 mt-6">
          {Array.from({ length: punches }).map((_, i) => (
            <div key={i} style={{
              aspectRatio: "1 / 1", borderRadius: "999px",
              background: i % 4 === 1 ? "var(--gold)" : i % 4 === 3 ? "var(--sage-light)" : "var(--on-dark)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {/* the cup, drawn rather than imported */}
              <span aria-hidden style={{
                display: "block", width: "42%", height: "34%",
                border: "1.5px solid var(--green-deep)",
                borderRadius: "0 0 40% 40%", borderTop: "none",
              }} />
            </div>
          ))}
        </div>
        <p className="mt-4" style={{ fontSize: 12.5, color: "var(--sage-light)" }}>
          {weeksKept} weeks the pot has been on.
        </p>
      </section>
    );
  }

  // ── Observatory: a constellation, one star per year, joined up ──
  const stars = Array.from({ length: Math.min(count, 12) }, (_, i) => ({
    // Scattered but stable — a fixed walk, so the sky does not rearrange
    // itself on every render.
    x: 8 + (i * 79 + (i % 3) * 17) % 84,
    y: 18 + ((i * 47) % 58),
    r: i % 4 === 0 ? 3.4 : 2.4,
  }));
  const path = stars.map((s, i) => `${i === 0 ? "M" : "L"} ${s.x} ${s.y}`).join(" ");
  return (
    <section className="mt-7" style={{
      background: "var(--green-deep)", padding: 22, borderRadius: "var(--radius-hero, 0)",
    }}>
      {label(`Observing since ${startYear}`)}
      {heading(years === 0 ? "The first light" : years === 1 ? "One year charted" : `${years} years charted`)}
      {sub(`${daysIntoYear.toLocaleString()} nights into the next`)}
      <svg viewBox="0 0 100 80" preserveAspectRatio="none"
        style={{ width: "100%", height: 118, marginTop: 18, display: "block" }}>
        <path d={path} fill="none" stroke="var(--gold)" strokeWidth="0.5" opacity="0.55" />
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r / 2.2}
            fill={i % 5 === 2 ? "var(--terracotta)" : i % 3 === 0 ? "var(--gold)" : "var(--on-dark)"} />
        ))}
      </svg>
      <p className="mt-3" style={{ fontSize: 12.5, color: "var(--sage-pale)" }}>
        {weeksKept} weeks of clear skies.
      </p>
    </section>
  );
}
