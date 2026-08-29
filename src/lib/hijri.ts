/**
 * The Hijri date, as Oman keeps it.
 *
 * No calculation can be authoritative here. Oman declares the month by local
 * moon sighting, so the official date can land a day either side of any
 * computed calendar. Umm al-Qura is the closest arithmetic standard and what
 * the rest of the Gulf publishes, so it is the base; `offset` lets a family
 * nudge it to whatever was actually announced.
 *
 * Intl does the conversion — no dependency, and the browser's own tables.
 */

const BASE_CALENDAR = "islamic-umalqura";

/** Shift a date by whole days without touching the original. */
function shifted(date: Date, days: number): Date {
  if (!days) return date;
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export interface HijriOptions {
  /** Days to add to the computed date, to match the local sighting. */
  offset?: number;
  timeZone?: string;
  /** Include the year and the AH suffix. */
  year?: boolean;
}

/** "16 Rabiʻ I" — or with year, "16 Rabiʻ I 1448 AH". */
export function formatHijri(date: Date, opts: HijriOptions = {}): string {
  const { offset = 0, timeZone = "Asia/Muscat", year = false } = opts;
  try {
    return new Intl.DateTimeFormat(`en-u-ca-${BASE_CALENDAR}`, {
      day: "numeric",
      month: "long",
      ...(year ? { year: "numeric" as const } : {}),
      timeZone,
    })
      .format(shifted(date, offset))
      // Intl writes "Rabiʻ I 16, 1448 AH"; this reads better as a date line.
      .replace(/^(\D+?)\s+(\d+)(?:,\s*(.*))?$/, (_, month, day, rest) =>
        rest ? `${day} ${month} ${rest}` : `${day} ${month}`,
      );
  } catch {
    // An engine without the Islamic calendars shouldn't take the page down.
    return "";
  }
}

/** Arabic numerals and month names: "١٦ ربيع الأول". */
export function formatHijriArabic(date: Date, opts: HijriOptions = {}): string {
  const { offset = 0, timeZone = "Asia/Muscat", year = false } = opts;
  try {
    return new Intl.DateTimeFormat(`ar-u-ca-${BASE_CALENDAR}`, {
      day: "numeric",
      month: "long",
      ...(year ? { year: "numeric" as const } : {}),
      timeZone,
    }).format(shifted(date, offset));
  } catch {
    return "";
  }
}
