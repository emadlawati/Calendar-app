/**
 * The library conceit, expressed in numbers.
 *
 * A "page" is a day the two of them have been together; a "volume" covers
 * two years of pages and is bound when it fills. The design brief's headline
 * figures (VOL. V / PAGE 3,495) fall out of exactly this model, so the app
 * derives them from the real relationship start date rather than hardcoding.
 */

const DAYS_PER_VOLUME = 730; // two years to a volume

const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "I";
  let rest = Math.floor(n);
  let out = "";
  for (const [value, numeral] of ROMAN) {
    while (rest >= value) {
      out += numeral;
      rest -= value;
    }
  }
  return out;
}

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
  /** 1-based volume number. */
  volume: number;
  volumeRoman: string;
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
  return {
    page,
    volume,
    volumeRoman: toRoman(volume),
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
