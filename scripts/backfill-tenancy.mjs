/**
 * One-off: create the first Couple from the existing env configuration and
 * claim every pre-tenancy row for it. Idempotent — safe to re-run.
 *
 *   node scripts/backfill-tenancy.mjs
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

// prisma.config.ts skips dotenv loading, so read .env ourselves.
const env = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
process.env.DATABASE_URL ||= env.DATABASE_URL;

const prisma = new PrismaClient();

const TENANT_MODELS = [
  "calendarEvent", "googleCalendarToken", "note", "bucketItem", "streak",
  "achievement", "memory", "recurringSeries", "specialDate", "reminder",
  "dailyHighlight", "pushSubscription", "comment", "reaction",
];

const wifeName = env.NEXT_PUBLIC_WIFE_NAME || env.WIFE_NAME || "Wife";
const husbandName = env.NEXT_PUBLIC_HUSBAND_NAME || env.HUSBAND_NAME || "Husband";

// Reuse the existing couple if this has already been run.
let couple = await prisma.couple.findFirst({ orderBy: { createdAt: "asc" } });

if (!couple) {
  couple = await prisma.couple.create({
    data: {
      displayName: `${wifeName} & ${husbandName}`,
      startDate: new Date(env.NEXT_PUBLIC_RELATIONSHIP_START || "2017-01-31"),
      childName: env.NEXT_PUBLIC_CHILD_NAME || null,
      timezone: "Asia/Muscat",
      users: {
        create: [
          {
            role: "Wife",
            email: (env.WIFE_EMAIL || "").toLowerCase(),
            name: wifeName,
            birthday: env.NEXT_PUBLIC_BUDOOR_BIRTHDAY || null,
          },
          {
            role: "Husband",
            email: (env.HUSBAND_EMAIL || "").toLowerCase(),
            name: husbandName,
            birthday: env.NEXT_PUBLIC_IMAD_BIRTHDAY || null,
          },
        ],
      },
    },
    include: { users: true },
  });
  console.log(`Created couple "${couple.displayName}" (${couple.id})`);
} else {
  console.log(`Reusing existing couple "${couple.displayName}" (${couple.id})`);
}

console.log("\nClaiming pre-tenancy rows:");
let claimed = 0;
for (const model of TENANT_MODELS) {
  const res = await prisma[model].updateMany({
    where: { coupleId: null },
    data: { coupleId: couple.id },
  });
  claimed += res.count;
  console.log(`  ${String(res.count).padStart(4)}  ${model}`);
}

console.log(`\nClaimed ${claimed} rows.`);

// Nothing should be left unowned.
let orphans = 0;
for (const model of TENANT_MODELS) {
  orphans += await prisma[model].count({ where: { coupleId: null } });
}
console.log(orphans === 0 ? "✓ no rows left without a couple" : `✗ ${orphans} rows still unowned`);

await prisma.$disconnect();
process.exit(orphans === 0 ? 0 : 1);
