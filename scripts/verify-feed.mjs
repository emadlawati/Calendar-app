/**
 * Structural checks on the subscribable .ics feed.
 *
 *   node scripts/verify-feed.mjs [baseUrl]
 *
 * Calendar clients are unforgiving and fail silently — a malformed feed just
 * never appears. This unfolds the output per RFC 5545 and asserts the parts
 * that actually break: line folding across emoji, all-day DATE values,
 * yearly recurrence, and that one partner's entries stay out of the other's.
 *
 * Needs a feed to already exist for the Husband role; create one from Our Shelf.
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
const env={};
for (const l of readFileSync("./.env","utf8").split("\n")) { const m=l.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/); if(m) env[m[1]]=m[2]; }
process.env.DATABASE_URL ||= env.DATABASE_URL;
const p = new PrismaClient();
const feed = await p.feedToken.findFirst({ where: { userId: "Husband" } });
const BASE = process.argv[2] || "http://localhost:3000";
if (!feed) { console.error("No feed token for Husband — create one on Our Shelf first."); process.exit(1); }
const body = await (await fetch(`${BASE}/api/feed/${feed.token}.ics`)).text();

// Unfold per RFC 5545: a CRLF followed by a space is a continuation.
const unfolded = body.replace(/\r\n[ \t]/g, "");
const lines = unfolded.split("\r\n");

let pass = 0, fail = 0;
const check = (n, ok, d="") => { ok?pass++:fail++; console.log(`  ${ok?"ok  ":"FAIL"}  ${n}${d?"  — "+d:""}`); };

const begins = lines.filter(l => l === "BEGIN:VEVENT").length;
const ends = lines.filter(l => l === "END:VEVENT").length;
check("every VEVENT is closed", begins === ends, `${begins} begin / ${ends} end`);

const uids = lines.filter(l => l.startsWith("UID:"));
check("every event has a UID", uids.length === begins);
check("UIDs are unique", new Set(uids).size === uids.length, `${new Set(uids).size}/${uids.length}`);

// Count only inside VEVENT — VTIMEZONE carries a DTSTART of its own.
let inEvent = false, starts = 0;
for (const l of lines) {
  if (l === "BEGIN:VEVENT") inEvent = true;
  else if (l === "END:VEVENT") inEvent = false;
  else if (inEvent && l.startsWith("DTSTART")) starts++;
}
check("every event has DTSTART", starts === begins, `${starts}/${begins}`);

check("timezone block present", unfolded.includes("BEGIN:VTIMEZONE") && unfolded.includes("TZID:Asia/Muscat"));
check("calendar name set", lines.some(l => l.startsWith("X-WR-CALNAME:")));

const allDay = lines.filter(l => l.startsWith("DTSTART;VALUE=DATE:")).length;
check("all-day entries use DATE values", allDay > 0, `${allDay} of them`);

const yearly = lines.filter(l => l === "RRULE:FREQ=YEARLY").length;
check("birthdays recur yearly", yearly >= 3, `${yearly} annual entries`);

// Emoji survive folding: titles begin with one.
const emojiTitles = lines.filter(l => /^SUMMARY:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(l));
check("emoji titles intact after unfolding", emojiTitles.length > 0, `${emojiTitles.length} such titles`);
check("no replacement characters anywhere", !unfolded.includes("\uFFFD"));

const tentative = lines.filter(l => l === "STATUS:TENTATIVE").length;
check("proposals marked tentative", tentative > 0, `${tentative} awaiting acceptance`);

// Person filtering: a wife-only entry must not be in the husband's feed.
const wifeOnly = await p.calendarEvent.findMany({ where: { personTag: "wife", archived: false }, select: { title: true } });
const leaked = wifeOnly.filter(e => unfolded.includes(e.title));
check("wife-tagged entries stay out of his feed", leaked.length === 0,
  wifeOnly.length ? `${wifeOnly.length} checked` : "none to check");

console.log(`\n${pass} passed, ${fail} failed`);
await p.$disconnect();
process.exit(fail === 0 ? 0 : 1);
