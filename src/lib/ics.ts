/**
 * Builds the subscribable calendar feed.
 *
 * This is what gives the family a real home-screen widget. A web app cannot
 * draw one — iOS needs WidgetKit, Android needs AppWidgetProvider — but both
 * platforms already ship a calendar widget, and both will subscribe to an
 * .ics feed. So the widget is the operating system's own, showing our data.
 *
 * RFC 5545, written out by hand: the format is small, and a dependency here
 * would be more code than the spec it implements.
 */

/** Oman keeps +04:00 all year, which makes the timezone block a fixed one. */
const TZID = "Asia/Muscat";
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "X-LIC-LOCATION:Asia/Muscat",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0400",
  "TZOFFSETTO:+0400",
  "TZNAME:+04",
  "DTSTART:19700101T000000",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** Escape per RFC 5545 §3.3.11: backslash, semicolon, comma, newline. */
function esc(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Lines must be folded at 75 octets. Folding by character would corrupt the
 * emoji that most of these titles start with, so this counts UTF-8 bytes and
 * only ever breaks between whole characters.
 */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = "";
  let bytes = 0;
  // Array.from splits by code point, so surrogate pairs stay together.
  for (const ch of Array.from(line)) {
    const size = enc.encode(ch).length;
    // Continuation lines start with a space, which costs one of the 75.
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  if (current) out.push(current);
  return out.map((l, i) => (i === 0 ? l : " " + l)).join("\r\n");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYYMMDD from a date-only value, read in UTC as it was stored. */
function dateOnly(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** YYYYMMDDTHHMMSS, local to TZID — the wall-clock time as entered. */
function localDateTime(d: Date, time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${dateOnly(d)}T${pad(h || 0)}${pad(m || 0)}00`;
}

function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** One day later, for the exclusive DTEND that all-day events require. */
function dayAfter(d: Date): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + 1);
  return x;
}

export interface FeedEvent {
  id: string;
  title: string;
  notes: string | null;
  date: Date;
  endDate: Date | null;
  time: string;
  endTime: string | null;
  allDay: boolean;
  status: string;
  personTag: string | null;
}

export interface FeedSpecialDate {
  id: string;
  title: string;
  date: Date;
  type: string; // "annual" | "one-time"
}

export interface FeedOptions {
  calendarName: string;
  events: FeedEvent[];
  specialDates: FeedSpecialDate[];
  /** Stable per feed, so clients recognise updates rather than duplicating. */
  domain?: string;
  now?: Date;
}

function eventBlock(e: FeedEvent, stamp: string, domain: string): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${e.id}@${domain}`, `DTSTAMP:${stamp}`];

  if (e.allDay) {
    // DTEND is exclusive for all-day events, so a one-day entry ends tomorrow.
    const last = e.endDate ?? e.date;
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.date)}`);
    lines.push(`DTEND;VALUE=DATE:${dateOnly(dayAfter(last))}`);
  } else {
    lines.push(`DTSTART;TZID=${TZID}:${localDateTime(e.date, e.time)}`);
    // No end time means an hour, which is what the app shows.
    const endBase = e.endDate ?? e.date;
    const endTime = e.endTime ?? addHour(e.time);
    const rollsOver = !e.endDate && !e.endTime && endTime === "00:00";
    lines.push(
      `DTEND;TZID=${TZID}:${localDateTime(rollsOver ? dayAfter(endBase) : endBase, endTime)}`,
    );
  }

  lines.push(`SUMMARY:${esc(e.title)}`);
  if (e.notes) lines.push(`DESCRIPTION:${esc(e.notes)}`);
  // A proposal the other person hasn't accepted shows as tentative rather
  // than as a settled plan.
  lines.push(e.status === "accepted" ? "STATUS:CONFIRMED" : "STATUS:TENTATIVE");
  if (e.status !== "accepted") lines.push("TRANSP:TRANSPARENT");
  lines.push("END:VEVENT");
  return lines;
}

function addHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${pad(((h || 0) + 1) % 24)}:${pad(m || 0)}`;
}

function specialBlock(d: FeedSpecialDate, stamp: string, domain: string): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:sd-${d.id}@${domain}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dateOnly(d.date)}`,
    `DTEND;VALUE=DATE:${dateOnly(dayAfter(d.date))}`,
    `SUMMARY:${esc(d.title)}`,
  ];
  // Birthdays and the anniversary repeat; milestones happen once.
  if (d.type === "annual") lines.push("RRULE:FREQ=YEARLY");
  lines.push("TRANSP:TRANSPARENT", "STATUS:CONFIRMED", "END:VEVENT");
  return lines;
}

export function buildIcs({
  calendarName,
  events,
  specialDates,
  domain = "couples-shared-calendar.vercel.app",
  now = new Date(),
}: FeedOptions): string {
  const stamp = utcStamp(now);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${domain}//Calendar Feed//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calendarName)}`,
    `X-WR-TIMEZONE:${TZID}`,
    // Both are honoured by different clients; neither is a guarantee.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...VTIMEZONE,
  ];

  for (const e of events) lines.push(...eventBlock(e, stamp, domain));
  for (const d of specialDates) lines.push(...specialBlock(d, stamp, domain));

  lines.push("END:VCALENDAR");

  // CRLF throughout, and a trailing one — some clients reject the file without.
  return lines.map(fold).join("\r\n") + "\r\n";
}
