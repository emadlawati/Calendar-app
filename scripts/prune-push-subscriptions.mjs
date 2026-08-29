/**
 * Keeps one push subscription per person per platform — the newest.
 *
 *   node scripts/prune-push-subscriptions.mjs [--commit]
 *
 * A browser that re-subscribes is issued a brand new endpoint rather than
 * reusing the old one, so rows accumulate and every notification is delivered
 * once per row. /api/push/subscribe now prunes as it registers; this clears
 * what built up before that.
 *
 * Safe: if a dropped subscription were somehow still live, that device simply
 * re-registers the next time the app is opened.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const COMMIT = process.argv.includes("--commit");
const p = new PrismaClient();

const platformOf = (endpoint) => {
  try {
    const host = new URL(endpoint).host;
    if (/fcm|google/.test(host)) return "Android/Chrome";
    if (/apple|icloud/.test(host)) return "iOS/Safari";
    if (/mozilla/.test(host)) return "Firefox";
    return host;
  } catch {
    return "unknown";
  }
};

const subs = await p.pushSubscription.findMany({ orderBy: { createdAt: "desc" } });

// Newest first, so the first of each group is the keeper.
const seen = new Set();
const drop = [];
for (const s of subs) {
  const key = `${s.coupleId}|${s.userId}|${platformOf(s.endpoint)}`;
  if (seen.has(key)) drop.push(s);
  else seen.add(key);
}

console.log(`${subs.length} subscription(s), keeping ${seen.size}\n`);
for (const s of drop) {
  console.log(
    `  ${COMMIT ? "removing" : "would remove"}  ${s.userId.padEnd(8)} ` +
    `${platformOf(s.endpoint).padEnd(16)} ${s.createdAt.toISOString().slice(0, 10)}`,
  );
}
if (drop.length === 0) console.log("  nothing stale");

if (COMMIT && drop.length > 0) {
  await p.pushSubscription.deleteMany({ where: { id: { in: drop.map((s) => s.id) } } });
  console.log(`\nRemoved ${drop.length}.`);
} else if (drop.length > 0) {
  console.log("\nDry run — nothing written. Re-run with --commit.");
}

await p.$disconnect();
