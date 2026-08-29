/**
 * The recurring-chore schedule, checked against the cases that actually bite.
 *
 *   npx jiti scripts/verify-tasks.ts
 *
 * Month-end and late completion are where this sort of arithmetic usually goes
 * wrong: a chore set for the 31st has to survive February, and one finished
 * three weeks late must not be created already overdue.
 */
import { nextDueOnOrAfter, nextAfter, bucketFor, type Schedule } from "../src/lib/tasks";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

let pass = 0, fail = 0;
const check = (name: string, got: string, want: string) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name.padEnd(52)} ${got}${ok ? "" : `  (wanted ${want})`}`);
};
const section = (t: string) => console.log(`\n${t}`);

const weekly = (weekday: number): Schedule => ({ frequency: "weekly", weekday });
const monthly = (monthDay: number): Schedule => ({ frequency: "monthly", monthDay });

section("Scheduling a new chore");
// 2026-08-29 is a Saturday (weekday 6); Sunday = 0.
check("daily, from Saturday", iso(nextDueOnOrAfter({ frequency: "daily" }, d("2026-08-29"))), "2026-08-29");
check("weekly on Tuesday, from Saturday", iso(nextDueOnOrAfter(weekly(2), d("2026-08-29"))), "2026-09-01");
check("weekly on Saturday, from that Saturday", iso(nextDueOnOrAfter(weekly(6), d("2026-08-29"))), "2026-08-29");
check("weekly on Sunday, from Saturday", iso(nextDueOnOrAfter(weekly(0), d("2026-08-29"))), "2026-08-30");
check("monthly on the 1st, from the 29th", iso(nextDueOnOrAfter(monthly(1), d("2026-08-29"))), "2026-09-01");
check("monthly on the 29th, from the 29th", iso(nextDueOnOrAfter(monthly(29), d("2026-08-29"))), "2026-08-29");

section("Month ends");
check("the 31st, scheduled from February", iso(nextDueOnOrAfter(monthly(31), d("2027-02-01"))), "2027-02-28");
check("the 31st, from March", iso(nextDueOnOrAfter(monthly(31), d("2027-03-01"))), "2027-03-31");
check("the 30th in a leap February", iso(nextDueOnOrAfter(monthly(30), d("2028-02-01"))), "2028-02-29");
check("the 31st of January rolls to February", iso(nextAfter(monthly(31), d("2027-01-31"), d("2027-01-31"))), "2027-02-28");
check("and back to 31 in March, not 28", iso(nextAfter(monthly(31), d("2027-02-28"), d("2027-02-28"))), "2027-03-31");

section("After finishing one");
check("daily", iso(nextAfter({ frequency: "daily" }, d("2026-09-01"), d("2026-09-01"))), "2026-09-02");
check("weekly", iso(nextAfter(weekly(2), d("2026-09-01"), d("2026-09-01"))), "2026-09-08");
check("fortnightly", iso(nextAfter({ frequency: "fortnightly", weekday: 2 }, d("2026-09-01"), d("2026-09-01"))), "2026-09-15");
check("monthly", iso(nextAfter(monthly(1), d("2026-09-01"), d("2026-09-01"))), "2026-10-01");

section("Finished late");
// Counted from when it was due, so being a day late does not shift the rhythm.
check("a day late still keeps the weekly slot", iso(nextAfter(weekly(2), d("2026-09-01"), d("2026-09-02"))), "2026-09-08");
// But three weeks late must not produce something already overdue.
check("three weeks late skips to the next real one", iso(nextAfter(weekly(2), d("2026-09-01"), d("2026-09-22"))), "2026-09-22");
check("months late, monthly", iso(nextAfter(monthly(1), d("2026-09-01"), d("2026-12-15"))), "2027-01-01");

section("How a task reads in the list");
const today = d("2026-08-29");
check("yesterday", bucketFor(d("2026-08-28"), today), "overdue");
check("today", bucketFor(today, today), "today");
check("tomorrow", bucketFor(d("2026-08-30"), today), "upcoming");
check("no date at all", bucketFor(null, today), "someday");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
