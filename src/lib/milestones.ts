/**
 * Milestones — things that have already happened, with the date they happened.
 *
 * The old system showed a grid of badges with an empty "?" tile beside them,
 * and stamped a card week by week. Both work the same way: they show you what
 * you have *not* got, so the app quietly becomes something you owe. A record
 * of a life should not be able to make you feel behind.
 *
 * So every milestone here is in the past and carries its date. There is no
 * next one to chase, no progress bar, no locked slot. You can only ever have
 * more of these, and missing a month costs nothing.
 */

export interface Milestone {
  id: string;
  label: string;
  /** What it was, in the family's own words where possible. */
  detail?: string;
  date: Date;
}

export interface MilestoneInput {
  /** Accepted events, oldest first, with their dates and titles. */
  events: { date: Date; title: string }[];
  memories: { createdAt: Date }[];
  notes: { createdAt: Date }[];
  highlights: { createdAt: Date }[];
  bucketDone: { createdAt: Date }[];
  startDate: Date;
  now?: Date;
}

/** Counting milestones that feel like something rather than arbitrary. */
const ENTRY_MARKS = [1, 10, 25, 50, 100, 250, 500, 1000];
const YEAR_WORDS: Record<number, string> = {
  1: "A year together",
  5: "Five years together",
  10: "Ten years together",
  20: "Twenty years together",
  25: "Twenty-five years together",
};

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

export function computeMilestones(input: MilestoneInput): Milestone[] {
  const { events, memories, notes, highlights, bucketDone, startDate } = input;
  const now = input.now ?? new Date();
  const out: Milestone[] = [];

  // ── Entries, at the moment each mark was passed ──
  for (const mark of ENTRY_MARKS) {
    if (events.length < mark) break;
    const at = events[mark - 1];
    out.push({
      id: `entries-${mark}`,
      label: mark === 1 ? "The first entry" : `${ordinal(mark)} entry`,
      detail: mark === 1 ? at.title : undefined,
      date: at.date,
    });
  }

  // ── The first of each kind of thing ──
  const firsts: [string, string, { createdAt: Date }[]][] = [
    ["memory", "The first memory kept", memories],
    ["letter", "The first letter", notes],
    ["highlight", "The first day worth marking", highlights],
    ["wish", "The first wish crossed off", bucketDone],
  ];
  for (const [id, label, rows] of firsts) {
    const first = rows
      .map((r) => r.createdAt)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (first) out.push({ id: `first-${id}`, label, date: first });
  }

  // ── Anniversaries already passed ──
  for (const [yearsStr, label] of Object.entries(YEAR_WORDS)) {
    const years = Number(yearsStr);
    const at = new Date(startDate);
    at.setFullYear(startDate.getFullYear() + years);
    if (at <= now) out.push({ id: `years-${years}`, label, date: at });
  }

  // Weeks kept deliberately has no entry here. The week each mark was passed
  // is not recorded, so every one would carry today's date — they would all
  // pile up at the top of a newest-first list claiming to have happened this
  // morning. It gets its own figure on the page instead, where it is true.

  // Nothing in the future. A milestone is something that has happened, and a
  // date ahead of today would be a promise rather than a record.
  return out
    .filter((m) => m.date <= now)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
