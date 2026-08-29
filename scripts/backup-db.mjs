/**
 * Dumps every tenant table to backups/<label>-<timestamp>.json.
 *
 *   node scripts/backup-db.mjs [label]
 *
 * Pair it with verify-integrity.mjs, which diffs a dump against the live
 * database row by row. Run this before any schema change.
 */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync, readFileSync } from "fs";

// Plain node scripts have no next/headers, so read .env by hand.
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const MODELS = [
  "couple", "coupleUser", "invite",
  "calendarEvent", "googleCalendarToken", "note", "bucketItem", "streak",
  "achievement", "memory", "recurringSeries", "specialDate", "reminder",
  "dailyHighlight", "pushSubscription", "comment", "reaction",
];

const label = process.argv[2] || "backup";
const p = new PrismaClient();
const out = {};
let total = 0;

for (const model of MODELS) {
  // A model added after this script was written shouldn't abort the backup.
  if (!p[model]) { console.warn(`  skipped ${model} — not in this schema`); continue; }
  out[model] = await p[model].findMany();
  total += out[model].length;
  console.log(`  ${String(out[model].length).padStart(4)}  ${model}`);
}

mkdirSync(new URL("../backups/", import.meta.url), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = new URL(`../backups/${label}-${stamp}.json`, import.meta.url);
writeFileSync(file, JSON.stringify(out, null, 2));

console.log(`\n${total} rows -> backups/${label}-${stamp}.json`);
await p.$disconnect();
