/**
 * What the home-screen widget shows.
 *
 * The blocks are deliberately a small, ordered menu rather than a layout
 * editor — a widget is a few square centimetres, and anything more than three
 * or four things in it stops being readable at a glance.
 */

export const WIDGET_BLOCKS = [
  { id: "date",     label: "Today's date",   hint: "with the Hijri date beneath" },
  { id: "volume",   label: "Volume and page", hint: "Vol. V · Page 3,497" },
  { id: "today",    label: "Today's entries", hint: "what's on, in order" },
  { id: "upcoming", label: "Coming up",       hint: "the next few days" },
  { id: "special",  label: "Next occasion",   hint: "birthday or anniversary, counted down" },
  { id: "streak",   label: "Weeks kept",      hint: "weeks you have both kept" },
] as const;

export type WidgetBlock = (typeof WIDGET_BLOCKS)[number]["id"];

export const BLOCK_IDS = WIDGET_BLOCKS.map((b) => b.id) as readonly WidgetBlock[];

export type WidgetTheme = "auto" | "light" | "dark";
export type WidgetSize = "small" | "medium" | "large";

export interface WidgetConfig {
  blocks: WidgetBlock[];
  /** How many entries to list before "and N more". */
  rows: number;
  theme: WidgetTheme;
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  blocks: ["date", "today", "special"],
  rows: 3,
  theme: "auto",
};

/**
 * Anything stored could have been written by an older version of the app, so
 * it is treated as untrusted and normalised rather than cast.
 */
export function parseWidgetConfig(raw: unknown): WidgetConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_WIDGET_CONFIG;
  const o = raw as Record<string, unknown>;

  const blocks = Array.isArray(o.blocks)
    ? (o.blocks.filter(
        (b): b is WidgetBlock => typeof b === "string" && BLOCK_IDS.includes(b as WidgetBlock),
      ))
    : DEFAULT_WIDGET_CONFIG.blocks;

  const rows =
    typeof o.rows === "number" && Number.isFinite(o.rows)
      ? Math.min(8, Math.max(1, Math.round(o.rows)))
      : DEFAULT_WIDGET_CONFIG.rows;

  const theme: WidgetTheme =
    o.theme === "light" || o.theme === "dark" || o.theme === "auto"
      ? o.theme
      : DEFAULT_WIDGET_CONFIG.theme;

  // An empty selection would render a blank rectangle, which reads as broken.
  return { blocks: blocks.length ? blocks : DEFAULT_WIDGET_CONFIG.blocks, rows, theme };
}

/** Pixel dimensions per widget size. Hosts scale these to fit. */
export const WIDGET_SIZES: Record<WidgetSize, { width: number; height: number }> = {
  small:  { width: 480, height: 480 },
  medium: { width: 1000, height: 480 },
  large:  { width: 1000, height: 1000 },
};

export function parseSize(raw: string | null): WidgetSize {
  return raw === "small" || raw === "medium" || raw === "large" ? raw : "medium";
}

/** The Reading Room palette, in both readings. */
export const WIDGET_PALETTE = {
  light: {
    paper: "#F7F5EC",
    card: "#FDFCF6",
    ink: "#2E3B2A",
    muted: "#6E7F5C",
    faint: "#9AA98B",
    rule: "#DCD8C6",
    gold: "#C9A227",
    terracotta: "#B4614A",
    green: "#3F5136",
  },
  dark: {
    paper: "#1B1F19",
    card: "#232820",
    ink: "#E7E9DC",
    muted: "#A9BC96",
    faint: "#71805F",
    rule: "#333A2C",
    gold: "#D4B443",
    terracotta: "#C87759",
    green: "#7E9469",
  },
} as const;
