/**
 * How long they have been together, in the terms the app says it out loud.
 *
 * This used to be a library conceit — "VOL. V / PAGE 3,495", a page per day
 * and a volume every two years, with the volume in Roman numerals. It needed
 * explaining every time, and the Roman numerals collided with a serif face
 * whose figures already read as letters. Years and days need no decoding.
 */

const DAYS_PER_VOLUME = 730; // kept for the shelf's one-spine-per-year drawing

/**
 * Fallback only. Every caller that knows its couple should pass
 * `couple.startDate` to getVolumeInfo() instead — the env var exists purely
 * so the maths still works before the session has loaded.
 */
export function relationshipStart(): Date {
  return new Date(process.env.NEXT_PUBLIC_RELATIONSHIP_START || "2017-01-31");
}

export interface VolumeInfo {
  /** Days together — the page number of the book. */
  page: number;
  /** 1-based volume number. Retained for the shelf drawing only. */
  volume: number;
  /** Whole years together. */
  years: number;
  /** Days since the last whole year — the remainder people actually quote. */
  daysIntoYear: number;
  /** "9 years, 211 days" — or "211 days" in the first year. */
  together: string;
  /** Pages written into the volume currently being bound. */
  pagesInVolume: number;
  /** Pages left before this volume closes. */
  pagesRemaining: number;
  /** Volumes already bound and closed. */
  volumesBound: number;
  startYear: number;
}

export function getVolumeInfo(
  startDate?: Date | string | null,
  now: number = Date.now(),
): VolumeInfo {
  const start = startDate ? new Date(startDate) : relationshipStart();
  const page = Math.max(0, Math.floor((now - start.getTime()) / 86_400_000));
  const volume = Math.max(1, Math.ceil(page / DAYS_PER_VOLUME));
  const pagesInVolume = page - (volume - 1) * DAYS_PER_VOLUME;

  // Counted on the calendar rather than by dividing days, so leap years and
  // month lengths land where a person would expect them to.
  const at = new Date(now);
  let years = at.getFullYear() - start.getFullYear();
  const anniversaryThisYear = new Date(start);
  anniversaryThisYear.setFullYear(start.getFullYear() + years);
  if (anniversaryThisYear.getTime() > now) {
    years -= 1;
    anniversaryThisYear.setFullYear(anniversaryThisYear.getFullYear() - 1);
  }
  years = Math.max(0, years);
  const daysIntoYear = Math.max(
    0,
    Math.floor((now - anniversaryThisYear.getTime()) / 86_400_000),
  );

  const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
  const together =
    years === 0
      ? plural(daysIntoYear, "day")
      : `${plural(years, "year")}, ${plural(daysIntoYear, "day")}`;

  return {
    page,
    volume,
    years,
    daysIntoYear,
    together,
    pagesInVolume,
    pagesRemaining: Math.max(0, DAYS_PER_VOLUME - pagesInVolume),
    volumesBound: Math.max(0, volume - 1),
    startYear: start.getFullYear(),
  };
}

/** "Thursday 27 August" — dates are spelled out in body copy. */
export function spellDate(d: Date, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const { weekday = true, year = false } = opts;
  return d.toLocaleDateString("en-GB", {
    ...(weekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "long",
    ...(year ? { year: "numeric" as const } : {}),
  });
}

/** Times use a full stop: "16.00". */
export function spellTime(time: string | null | undefined): string {
  if (!time) return "";
  return time.replace(":", ".");
}

/** Catalogue number: "26·08·26" */
export function catalogueNumber(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}·${p(d.getMonth() + 1)}·${p(d.getFullYear() % 100)}`;
}
