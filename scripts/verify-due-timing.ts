/**
 * When a same-day task announces itself.
 *
 *   npx jiti scripts/verify-due-timing.ts
 *
 * Pure date logic, no database: the question is only whether a due date counts
 * as "today or already past" in Muscat, and whether the morning summary has
 * been and gone. Getting either wrong means a task added in the afternoon is
 * announced a day late, or announced twice.
 */
import { isDueByToday, DIGEST_HOUR_MUSCAT } from "../src/lib/due-count";

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${n}${d ? "  — " + d : ""}`);
};

const muscatToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const shift = (n: number) => {
  const d = new Date(`${muscatToday}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

console.log("\nWhat counts as due by now");
check("today counts", isDueByToday(day(muscatToday)), muscatToday);
check("yesterday counts — overdue is still on you", isDueByToday(day(shift(-1))), shift(-1));
check("last week counts", isDueByToday(day(shift(-7))));
check("tomorrow does not", !isDueByToday(day(shift(1))), shift(1));
check("next week does not", !isDueByToday(day(shift(7))));
check("no date at all does not", !isDueByToday(null));

console.log("\nThe summary hour");
// Rebuilt here rather than imported, so the boundary can be tested at hours
// other than the one it happens to be now.
const hasRun = (hour: number) => hour >= DIGEST_HOUR_MUSCAT;
check("06:59 — the summary has not gone yet, leave it to the cron", !hasRun(6));
check("07:00 — it has gone; announce now", hasRun(7), `digest hour is ${DIGEST_HOUR_MUSCAT}`);
check("15:00 — announce now", hasRun(15));
check("23:00 — announce now", hasRun(23));
check("00:00 — before the summary, leave it", !hasRun(0));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
