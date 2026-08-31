"use client";

import { useTheme } from "./ThemeProvider";
import ThemeGlyph, { type GlyphName } from "./ThemeGlyph";

/**
 * Block 4 of the stats page: the 4-up grid.
 *
 * The brief calls this the badge grid — three earned and one unknown `?`. It
 * is built here from milestones that have already happened rather than from a
 * badge table, because the objection to the old system was the earning, not
 * the drawing: nothing here is awarded, and nothing is withheld.
 *
 * The fourth plate is the brief's unknown, read honestly. It is not a locked
 * reward with the name hidden — it is the next thing, whatever it turns out to
 * be, and it says so.
 *
 * Shape follows the theme, as the brief specifies: Reading Room bookplates are
 * square, Coffee's beans and Observatory's charted marks are circles.
 */

interface Mark { id: string; label: string; date: string }

export default function ThemeMarks({ milestones }: { milestones: Mark[] }) {
  const { theme } = useTheme();
  const square = theme === "reading-room";

  // Newest three, oldest first, so the row reads left to right in time.
  const recent = milestones.slice(0, 3).reverse();

  const heading =
    theme === "reading-room" ? "Bookplates"
    : theme === "coffee" ? "Beans collected"
    : "Charted";

  // Each theme's three glyphs, in the order the brief gives them.
  const glyphs: GlyphName[] =
    theme === "reading-room" ? ["book", "book", "book"]
    : theme === "coffee" ? ["bean", "cup", "bean"]
    : ["star", "planet", "crescent"];

  const inks = ["var(--terracotta)", "var(--gold)", "var(--sage)"];

  if (recent.length === 0) {
    return (
      <section className="mt-9">
        <p className="rr-label">{heading}</p>
        <p className="rr-italic mt-3" style={{ fontSize: 15, color: "var(--ghost)" }}>
          the first entry will be the first one
        </p>
      </section>
    );
  }

  return (
    <section className="mt-9">
      <p className="rr-label">{heading}</p>
      <div className="grid grid-cols-4 gap-2.5 mt-4">
        {recent.map((m, i) => (
          <Plate key={m.id} square={square} caption={shorten(m.label)}>
            <ThemeGlyph name={glyphs[i]} size={square ? 22 : 24} style={{ color: inks[i] }} />
          </Plate>
        ))}
        <Plate square={square} caption="not yet" dashed>
          <span className="rr-display" style={{ fontSize: 22, color: "var(--ghost)", lineHeight: 1 }}>?</span>
        </Plate>
      </div>
      <p className="mt-3" style={{ fontSize: 12, color: "var(--faint)" }}>
        The last three that happened, and whatever comes next.
      </p>
    </section>
  );
}

function Plate({
  square,
  caption,
  dashed,
  children,
}: {
  square: boolean;
  caption: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex items-center justify-center w-full"
        style={{
          aspectRatio: "1 / 1",
          borderRadius: square ? 0 : "999px",
          border: dashed ? "1px dashed var(--rule-strong)" : "1px solid var(--rule)",
          background: dashed ? "transparent" : "var(--card)",
        }}
      >
        {children}
      </div>
      <span
        className="text-center"
        style={{
          fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase",
          fontFamily: "var(--font-ui)", color: dashed ? "var(--ghost)" : "var(--faint)",
          lineHeight: 1.3,
        }}
      >
        {caption}
      </span>
    </div>
  );
}

/** Milestone labels are sentences; a plate caption has room for two words. */
function shorten(label: string): string {
  return label
    .replace(/^The first /, "1st ")
    .replace(/^(\d+)(st|nd|rd|th) entry$/, "$1$2")
    .replace(/ crossed off$/, "")
    .replace(/ worth marking$/, "")
    .replace(/ kept$/, "")
    .slice(0, 16);
}
