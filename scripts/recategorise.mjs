/**
 * Re-files existing events under the new categories.
 *
 *   node scripts/recategorise.mjs            # show the mapping, change nothing
 *   node scripts/recategorise.mjs --commit
 *
 * Two passes. First the retired ids move to their successors — that part is
 * mechanical. Then the events that were only ever "Other" because nothing fit
 * are matched on their titles, which is a judgement, so the dry run prints
 * every one of them for a person to disagree with before anything is written.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const COMMIT = process.argv.includes("--commit");
const p = new PrismaClient();

/** Retired category ids and where they now belong. */
const RETIRED = { outings: "family", errands: "appointments" };

/**
 * Title patterns, most specific first. Only ever applied to events with no
 * category or "other" — an event someone deliberately filed is left alone.
 */
const RULES = [
  [/hifdh|qur|quran|salat|prayer|matam|arbaeen|ashura|eid|ramadan|masjid|mosque|majlis/i, "faith"],
  [/trip|flight|travel|airport|getaway|retreat|holiday|london|dubai|🇬🇧|🇰🇷|hotel|anantara|seoul/i, "travel"],
  // Before appointments, so both of Yusr's vaccinations land in the same
  // place. Left the other way round they split, which is worse than either
  // answer on its own.
  [/vaccination|nursery|playgroup|play date|playdate|school|paediatric|pediatric|yusr/i, "child"],
  [/appointment|dentist|dental|doctor|clinic|salon|check-?up|garage|renew|bank|passport/i, "appointments"],
  [/birthday|anniversary|eid al|wedding|graduation|gold/i, "occasions"],
  [/dinner|lunch|breakfast|coffee|meet|visit|party|gathering|brunch/i, "social"],
  [/date night|our |just us|getaway/i, "betime"],
];

const classify = (title) => RULES.find(([re]) => re.test(title))?.[1] ?? null;

const events = await p.calendarEvent.findMany({
  select: { id: true, title: true, category: true },
  orderBy: { createdAt: "asc" },
});

const moves = [];
for (const e of events) {
  const current = e.category ?? "";
  if (current in RETIRED) {
    // Ask the title first. "We're going to London!" was filed under the old
    // Outings, and mapping that mechanically to Family would have buried a
    // trip that now has a category of its own.
    const guess = classify(e.title);
    moves.push({ ...e, to: guess ?? RETIRED[current], why: guess ? "matched on title" : "retired category" });
  } else if (!current || current === "other") {
    const guess = classify(e.title);
    if (guess) moves.push({ ...e, to: guess, why: "matched on title" });
  }
}

// Grouped by destination so the judgement calls are easy to scan.
const byTarget = {};
for (const m of moves) (byTarget[m.to] ??= []).push(m);

console.log(`${events.length} events, ${moves.length} would move\n`);
for (const [to, rows] of Object.entries(byTarget).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  → ${to}  (${rows.length})`);
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.title)) continue;
    seen.add(r.title);
    const n = rows.filter((x) => x.title === r.title).length;
    console.log(`      ${(n > 1 ? `${n}× ` : "").padStart(5)}${(r.category || "none").padEnd(12)} ${r.title.slice(0, 44)}`);
  }
}

const untouched = events.filter(
  (e) => !moves.find((m) => m.id === e.id) && (!e.category || e.category === "other"),
);
if (untouched.length) {
  console.log(`\n  staying in "Other" (${untouched.length}) — nothing matched:`);
  for (const e of [...new Set(untouched.map((x) => x.title))]) console.log(`      ${e.slice(0, 50)}`);
}

if (COMMIT && moves.length) {
  for (const m of moves) {
    await p.calendarEvent.update({ where: { id: m.id }, data: { category: m.to } });
  }
  console.log(`\nMoved ${moves.length}.`);
} else if (moves.length) {
  console.log("\nDry run — nothing written. Re-run with --commit.");
}

await p.$disconnect();
