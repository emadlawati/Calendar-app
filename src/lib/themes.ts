/**
 * The three skins, and the words each one uses.
 *
 * A theme is a palette, a type pairing, a shape language and a vocabulary.
 * The first three live in globals.css as tokens under [data-theme="…"]; the
 * fourth lives here, because copy cannot be a CSS variable.
 *
 * What a theme is *not*: a different app. The screens, the data and the rules
 * are identical in all three. Anything structural belongs outside this file.
 */

export const THEME_IDS = ["reading-room", "coffee", "observatory"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const isThemeId = (v: unknown): v is ThemeId =>
  typeof v === "string" && (THEME_IDS as readonly string[]).includes(v);

export const DEFAULT_THEME: ThemeId = "reading-room";

export interface ThemeWords {
  /** What the stats page is called in the drawer and on its own header. */
  shelf: string;
  /** And the wish list. */
  wishlist: string;
  /** Subtitle under the stats page title. */
  shelfSubtitle: string;
  /** The cumulative "weeks kept" figure, in this theme's words. */
  weeksKeptLabel: string;
  weeksKeptLine: string;
  /** The closing line on the stats page. */
  closing: string;
  /** Empty day on the calendar. */
  emptyDay: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  /** One line, for the picker. */
  blurb: string;
  /** How it feels, for the picker. */
  feeling: string;
  /** Swatches for the picker, in the theme's own colours. */
  swatch: { ground: string; ink: string; one: string; two: string };
  dark: boolean;
  words: ThemeWords;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  "reading-room": {
    id: "reading-room",
    name: "Reading Room",
    blurb: "A private library. Ruled paper, square corners, ink and gold.",
    feeling: "archival, still, literary",
    swatch: { ground: "#F7F5EC", ink: "#2E3B2A", one: "#A8553E", two: "#C9A227" },
    dark: false,
    words: {
      shelf: "Our Shelf",
      wishlist: "Reading list",
      shelfSubtitle: "together",
      weeksKeptLabel: "Weeks kept",
      weeksKeptLine: "weeks with something written down. This only ever goes up.",
      closing: "a record of what happened, not a score",
      emptyDay: "the rest of the page is blank",
    },
  },
  coffee: {
    id: "coffee",
    name: "Coffee & Matcha",
    blurb: "A small café the two of you run. Warm, round, everything on a receipt.",
    feeling: "warm, everyday, wry",
    swatch: { ground: "#F7F0E4", ink: "#382312", one: "#9A5B2A", two: "#7A9E52" },
    dark: false,
    words: {
      shelf: "Our Café",
      wishlist: "Someday list",
      shelfSubtitle: "open together",
      weeksKeptLabel: "Weeks the pot was on",
      weeksKeptLine: "weeks you served something. Nothing here goes cold.",
      closing: "no points, no levels — two regulars, one table",
      emptyDay: "nothing on the board today",
    },
  },
  observatory: {
    id: "observatory",
    name: "Observatory",
    blurb: "An observing log. Deep indigo, engraved type, a sparse sky.",
    feeling: "quiet, wondrous, precise",
    swatch: { ground: "#0C1330", ink: "#EFEDFF", one: "#C98BC0", two: "#F0C271" },
    dark: true,
    words: {
      shelf: "Our Sky",
      wishlist: "Wish list",
      shelfSubtitle: "observing together",
      weeksKeptLabel: "Weeks of clear skies",
      weeksKeptLine: "weeks with something logged. Nothing here goes dark again.",
      closing: "no points, no levels — a sky that fills in",
      emptyDay: "nothing logged for tonight",
    },
  },
};

export const themeOf = (id: string | null | undefined): ThemeDefinition =>
  THEMES[isThemeId(id) ? id : DEFAULT_THEME];
