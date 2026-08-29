/**
 * Where a week begins.
 *
 * One definition, used by both the calendar grid and the streak buckets. If
 * these ever disagreed, "this week" on the borrower's card would mean a
 * different span of days from the row the calendar draws — which is the sort
 * of thing nobody notices until a streak breaks for no visible reason.
 *
 * Sunday, as the working week runs in Oman.
 */
export const WEEK_STARTS_ON = 0; // 0 = Sunday, 1 = Monday

/** Single-letter column headings, in week order. */
export const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** Full names, in week order — for aria labels and anything spelled out. */
export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/**
 * How many days into the week a given weekday falls.
 * Sunday-start: Sunday -> 0, Saturday -> 6.
 */
export function weekdayIndex(jsDay: number): number {
  return (jsDay - WEEK_STARTS_ON + 7) % 7;
}
