"use client";

import { useTheme } from "./ThemeProvider";
import ThemeGlyph from "./ThemeGlyph";
import StarField from "./StarField";

/**
 * Home's most prominent card — the one the brief calls "the single most
 * prominent card on any screen".
 *
 * It used to be one object: a Reading Room title page with a double rule, an
 * open-book glyph and "Cat. no." on it, wearing whichever palette was
 * selected. That is the thing that made a theme switch look like a recolour.
 * The brief gives each theme a different object here, so this draws three:
 *
 *   Reading Room  a title page — double rule, book glyph, catalogue number
 *   Coffee        a menu board — espresso header bar over a cream body,
 *                 the date range on dotted leaders
 *   Observatory   a panel under a sparse star field, progress drawn as a
 *                 shallow orbital arc rather than a bar
 *
 * The content is identical in all three. Only the object changes.
 */

export interface LiveCardProps {
  label: string;
  title: string;
  dateLine: string;
  category: string;
  reference: string;
  /** Position within a multi-day span, if it is one. */
  span: { day: number; of: number } | null;
  onOpen: () => void;
  onNote: () => void;
  onPhoto: () => void;
  onKeep: () => void;
}

export default function LiveCard(props: LiveCardProps) {
  const { theme } = useTheme();
  if (theme === "coffee") return <MenuBoard {...props} />;
  if (theme === "observatory") return <SkyPanel {...props} />;
  return <TitlePage {...props} />;
}

/** Shared: the three actions along the foot of the card. */
function Actions({ onNote, onPhoto, onKeep }: Pick<LiveCardProps, "onNote" | "onPhoto" | "onKeep">) {
  const { definition } = useTheme();
  const w = definition.words;
  return (
    <div className="rr-hairline mt-5 pt-4 flex items-center gap-5">
      <button className="rr-action" onClick={onNote}>{w.noteAction}</button>
      <button className="rr-action" onClick={onPhoto}>{w.photoAction}</button>
      <button className="rr-action rr-action-danger ml-auto" onClick={onKeep}>{w.keepAction}</button>
    </div>
  );
}

// ── Reading Room ─────────────────────────────────────────────────────
// A title page: outer rule, 6px gutter, inner rule.
function TitlePage(p: LiveCardProps) {
  const { definition } = useTheme();
  const w = definition.words;
  return (
    <div className="rr-double">
      <div>
        <div className="flex items-center gap-2">
          <ThemeGlyph name="book" size={18} style={{ color: "var(--sage)" }} />
          <span className="rr-label" style={{ color: "var(--terracotta)" }}>{p.label}</span>
        </div>
        <button onClick={p.onOpen} className="block text-left w-full mt-3">
          <h2 className="rr-display" style={{ fontSize: 34, lineHeight: 1.08, color: "var(--ink)" }}>
            {p.title}
          </h2>
        </button>
        <p className="rr-italic mt-2" style={{ fontSize: 15, color: "var(--muted)" }}>
          {p.dateLine} · {p.category}
        </p>
        <p className="rr-meta mt-4">
          {w.refPrefix} {p.reference}
          {p.span && ` — ${w.spanWord(p.span.day, p.span.of)}`}
        </p>
        <Actions {...p} />
      </div>
    </div>
  );
}

// ── Coffee & Matcha ──────────────────────────────────────────────────
// A menu board: a dark header bar carrying the mono label and the mono
// progress, over a cream body. The date range sits on the theme's signature
// dotted leader.
function MenuBoard(p: LiveCardProps) {
  const { definition } = useTheme();
  const w = definition.words;
  return (
    <div style={{
      borderRadius: "var(--radius-hero)", overflow: "hidden",
      border: "1px solid var(--rule)", background: "var(--card)",
    }}>
      <div className="flex items-center justify-between gap-3"
        style={{ background: "var(--ink)", padding: "11px 18px" }}>
        <span className="rr-label" style={{ color: "var(--sage-pale)" }}>{p.label}</span>
        {p.span && (
          <span className="rr-meta" style={{ color: "var(--sage-light)", fontSize: 10 }}>
            {w.spanWord(p.span.day, p.span.of)}
          </span>
        )}
      </div>

      <div style={{ padding: "20px 18px" }}>
        <button onClick={p.onOpen} className="block text-left w-full">
          <h2 className="rr-display" style={{ fontSize: 32, lineHeight: 1.08, color: "var(--ink)" }}>
            {p.title}
          </h2>
        </button>

        <Leader left={p.dateLine} right={p.category} />

        <p className="rr-meta mt-3" style={{ fontSize: 10 }}>
          {w.refPrefix} {p.reference}
        </p>
        <Actions {...p} />
      </div>
    </div>
  );
}

/**
 * The dot leader — Coffee's signature device, and the reason a café reads as
 * a café: a title, a run of dots, a value. Used here and on the countdowns.
 */
export function Leader({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-baseline gap-2 mt-3">
      <span style={{ fontSize: 14.5, color: "var(--muted)", flex: "none" }}>{left}</span>
      <span aria-hidden style={{
        flex: 1, borderBottom: "1.5px dotted var(--rule-strong)", transform: "translateY(-3px)",
      }} />
      <span className="rr-meta" style={{ fontSize: 11, color: "var(--ink)", flex: "none" }}>{right}</span>
    </div>
  );
}

// ── Observatory ──────────────────────────────────────────────────────
// A panel under a sparse star field; progress is a shallow arc with a lit dot
// at the current position, never a bar.
function SkyPanel(p: LiveCardProps) {
  const { definition } = useTheme();
  const w = definition.words;
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      borderRadius: "var(--radius-hero)", border: "1px solid var(--rule)",
      background: "var(--card)", padding: 20,
    }}>
      <StarField />
      <div style={{ position: "relative" }}>
        <div className="flex items-center gap-2">
          <ThemeGlyph name="star" size={13} style={{ color: "var(--gold)" }} />
          <span className="rr-label" style={{ color: "var(--gold)" }}>{p.label}</span>
        </div>

        <button onClick={p.onOpen} className="block text-left w-full mt-3">
          <h2 className="rr-display" style={{ fontSize: 32, lineHeight: 1.1, color: "var(--ink)" }}>
            {p.title}
          </h2>
        </button>

        <p className="mt-2" style={{ fontSize: 15, color: "var(--muted)" }}>
          {p.dateLine} · {p.category}
        </p>

        {p.span && <OrbitalArc day={p.span.day} of={p.span.of} />}

        <p className="rr-meta mt-4" style={{ fontSize: 10 }}>
          {w.refPrefix} {p.reference}
          {p.span && ` · ${w.spanWord(p.span.day, p.span.of)}`}
        </p>
        <Actions {...p} />
      </div>
    </div>
  );
}

/**
 * Progress along a multi-day event, drawn as a shallow arc: a 1px line, dim
 * dots at each end, and a lit dot at the current position. The brief is
 * explicit that this replaces any progress bar.
 */
function OrbitalArc({ day, of }: { day: number; of: number }) {
  const t = of <= 1 ? 1 : (day - 1) / (of - 1);
  // A quadratic through (4,26) → (100,10) → (196,26); the point at parameter
  // t on that curve is where the marker sits.
  const [x0, y0, cx, cy, x1, y1] = [4, 26, 100, 8, 196, 26];
  const mt = 1 - t;
  const px = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
  const py = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
  return (
    <svg viewBox="0 0 200 32" style={{ width: "100%", height: 34, marginTop: 16, display: "block" }}>
      <path d={`M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`}
        fill="none" stroke="var(--rule-strong)" strokeWidth="1" />
      <circle cx={x0} cy={y0} r="2" fill="var(--faint)" />
      <circle cx={x1} cy={y1} r="2" fill="var(--faint)" />
      <circle cx={px} cy={py} r="3.4" fill="var(--gold)" />
    </svg>
  );
}
