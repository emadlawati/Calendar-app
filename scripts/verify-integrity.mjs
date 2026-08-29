/**
 * Diffs every row in a pre-migration backup against the live database.
 *
 *   node scripts/verify-integrity.mjs [backups/xxx.json]
 *
 * Reports rows that were LOST, CHANGED, or ADDED since the backup. coupleId
 * and updatedAt are ignored: the tenancy backfill touched both on every row
 * by design, and neither carries meaning the couple would notice.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
const backup = JSON.parse(readFileSync(process.argv[2] || "./backups/pre-tenancy-2026-08-28T18-26-38-976Z.json", "utf8"));
const p = new PrismaClient();

// coupleId is expected to be new on every row; ignore it in the comparison.
const IGNORE = new Set(["coupleId","updatedAt"]);
const norm = (v) => (v instanceof Date ? v.toISOString() : v);

let lost = 0, changed = 0, added = 0, sameRows = 0;
const report = [];

for (const [model, rows] of Object.entries(backup)) {
  const live = await p[model].findMany();
  const liveById = new Map(live.map((r) => [r.id, r]));

  for (const old of rows) {
    const now = liveById.get(old.id);
    if (!now) { lost++; report.push(`LOST    ${model} ${old.id} ${JSON.stringify(old).slice(0,90)}`); continue; }
    liveById.delete(old.id);
    const diffs = [];
    for (const k of Object.keys(old)) {
      if (IGNORE.has(k)) continue;
      const a = JSON.stringify(norm(old[k])), b = JSON.stringify(norm(now[k]));
      if (a !== b) diffs.push(`${k}: ${a.slice(0,60)} -> ${b.slice(0,60)}`);
    }
    if (diffs.length) { changed++; report.push(`CHANGED ${model} ${old.id}\n           ${diffs.join("\n           ")}`); }
    else sameRows++;
  }
  for (const extra of liveById.values()) { added++; report.push(`ADDED   ${model} ${extra.id} ${JSON.stringify(extra).slice(0,90)}`); }
}

console.log(report.join("\n") || "(no differences at all)");
console.log(`\nidentical: ${sameRows}   lost: ${lost}   changed: ${changed}   added since backup: ${added}`);
await p.$disconnect();
