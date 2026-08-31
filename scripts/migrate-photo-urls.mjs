/**
 * Rewrites stored blob URLs to app paths.
 *
 *   node scripts/migrate-photo-urls.mjs [--commit]
 *
 * Photos were stored as absolute Vercel Blob URLs — public, permanent, and
 * handed out in every API response that carried a photo. They are now served
 * through /api/photos, which checks the session and the owning family first.
 * This converts what is already in the database.
 *
 * The blob files themselves do not move. Anyone who already holds one of the
 * old URLs keeps working access to that file; only new links are controlled.
 * Closing that would mean re-uploading every photo under a fresh path, which
 * is a bigger and more destructive job than it is worth for six pictures.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const COMMIT = process.argv.includes("--commit");
const p = new PrismaClient();

/** A blob URL becomes the path the app serves it under. */
function toAppPath(url) {
  if (typeof url !== "string" || !url.startsWith("http")) return url; // already migrated
  try {
    const key = new URL(url).pathname.replace(/^\//, "");
    if (!key.startsWith("memories/")) return url;
    return `/api/photos/${key.split("/").map(encodeURIComponent).join("/")}`;
  } catch {
    return url;
  }
}

// Both models store the same thing: a JSON array of URLs in `photos`.
async function rewrite(name, model) {
  let changed = 0;
  for (const row of await model.findMany({ where: { photos: { not: null } }, select: { id: true, photos: true } })) {
    let arr;
    try { arr = JSON.parse(row.photos); } catch { continue; }
    if (!Array.isArray(arr)) continue;
    const next = arr.map(toAppPath);
    if (JSON.stringify(next) === JSON.stringify(arr)) continue;
    changed++;
    console.log(`  ${name} ${row.id.slice(0, 8)}  ${arr.length} photo(s)`);
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== next[i]) console.log(`      ${String(arr[i]).slice(0, 58)}…\n   -> ${next[i]}`);
    }
    if (COMMIT) await model.update({ where: { id: row.id }, data: { photos: JSON.stringify(next) } });
  }
  return changed;
}

const memories = await rewrite("memory", p.memory);
const highlights = await rewrite("highlight", p.dailyHighlight);

console.log(
  `\n${memories} memory row(s), ${highlights} highlight row(s)` +
  (COMMIT ? " rewritten." : " would change.\nDry run — nothing written. Re-run with --commit."),
);
await p.$disconnect();
