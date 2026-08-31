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
  /**
   * The two figures on the stats page — a period count and a lifetime count.
   * The brief gives these verbatim per theme: "5 volumes bound / 80 entries
   * written", "80 cups poured / 5 cards filled", "5 constellations / 80
   * observations".
   */
  figurePeriod: string;
  figureLifetime: string;
  /** What the calendar itself is called. Only Observatory renames it. */
  calendar: string;

  /**
   * The live card and the rows under it. The brief gives each theme its own
   * voice for these — "Open on the desk" / "Now brewing" / "In transit now" —
   * and until now every theme spoke Reading Room's.
   */
  liveNow: string;
  liveNext: string;
  liveEmpty: string;
  /** The heading over the countdown rows. */
  laterLabel: string;
  /** The accent action on the live card. */
  keepAction: string;
  /** The two secondary actions. */
  noteAction: string;
  photoAction: string;
  /** Prefix for the reference number: "Cat. no." / "ORDER" / "OBS". */
  refPrefix: string;
  /** How a day within a multi-day span is said. */
  spanWord: (day: number, of: number) => string;
  /** Heading over the most recent memory on Home. */
  lastMemory: string;
  /** The drawer's footer box — the streak in this theme's words. */
  drawerOn: (weeks: number) => string;
  drawerOnSub: string;
  drawerOff: string;
  drawerOffSub: string;

  /** Our Story: the verb in "N entries … this year", and the empty states. */
  storyVerb: string;
  storyEmpty: string;
  ledgerEmpty: string;
  /** The floating button on Our Story. */
  writtenFab: string;

  /** The new-entry screen's title and its commit button. */
  newEntryTitle: string;
  fileAction: string;
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

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const roman = (n: number) => ROMAN[n] ?? String(n);

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
      figurePeriod: "volumes bound",
      figureLifetime: "entries written",
      calendar: "Calendar",
      liveNow: "Open on the desk",
      liveNext: "Next in the volume",
      liveEmpty: "nothing is open — the rest of the page is blank",
      laterLabel: "Later in the volume",
      keepAction: "Bind it",
      noteAction: "Margin notes",
      photoAction: "Photograph",
      refPrefix: "Cat. no.",
      spanWord: (d, of) => `${d} of ${of} days`,
      lastMemory: "Last entry filed",
      drawerOn: (n) => `${n} ${n === 1 ? "week" : "weeks"}, unbroken`,
      drawerOnSub: "the card is stamped again",
      drawerOff: "the card is unstamped",
      drawerOffSub: "write something and it begins",
      storyVerb: "bound",
      storyEmpty: "nothing bound yet — the rest of the page is blank",
      ledgerEmpty: "the ledger is empty",
      writtenFab: "A written entry",
      newEntryTitle: "A new entry",
      fileAction: "File",
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
      figurePeriod: "cards filled",
      figureLifetime: "cups poured",
      calendar: "Calendar",
      liveNow: "Now brewing",
      liveNext: "Next on the menu",
      liveEmpty: "nothing on the board today",
      laterLabel: "Next on the menu",
      keepAction: "Keep it",
      noteAction: "Add a note",
      photoAction: "Photo",
      refPrefix: "Order",
      spanWord: (d, of) => `DAY ${d}/${of}`,
      lastMemory: "Last order",
      drawerOn: (n) => `The pot's been on ${n} ${n === 1 ? "week" : "weeks"}`,
      drawerOnSub: "still warm",
      drawerOff: "The pot is off",
      drawerOffSub: "put something on and it starts",
      storyVerb: "served",
      storyEmpty: "nothing served yet — the board is clean",
      ledgerEmpty: "no orders on the book yet",
      writtenFab: "A note",
      newEntryTitle: "A new order",
      fileAction: "Put it on",
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
      figurePeriod: "constellations",
      figureLifetime: "observations",
      calendar: "Star chart",
      liveNow: "In transit now",
      liveNext: "Approaching",
      liveEmpty: "nothing logged for tonight",
      laterLabel: "Approaching",
      keepAction: "Log it",
      noteAction: "Add to the log",
      photoAction: "Photograph",
      refPrefix: "Obs",
      spanWord: (d, of) => `NIGHT ${roman(d)} OF ${roman(of)}`,
      lastMemory: "Last observation",
      drawerOn: (n) => `${n} ${n === 1 ? "week" : "weeks"} of clear skies`,
      drawerOnSub: "nothing has gone dark",
      drawerOff: "No clear nights yet",
      drawerOffSub: "log something and the sky opens",
      storyVerb: "logged",
      storyEmpty: "nothing logged yet — the sky is clear",
      ledgerEmpty: "the log is empty",
      writtenFab: "An observation",
      newEntryTitle: "A new transit",
      fileAction: "Log it",
    },
  },
};

export const themeOf = (id: string | null | undefined): ThemeDefinition =>
  THEMES[isThemeId(id) ? id : DEFAULT_THEME];
