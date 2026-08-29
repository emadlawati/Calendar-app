/**
 * Turns each family's `childName` string into a real member row, and makes
 * the roster the source of truth for birthdays.
 *
 *   node scripts/backfill-family.mjs [--commit]
 *
 * Without --commit it only reports what it would do. Idempotent: safe to run
 * twice, and re-running after a partial failure resumes rather than duplicates.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const COMMIT = process.argv.includes("--commit");
const p = new PrismaClient();
const log = (...a) => console.log(COMMIT ? " " : "[dry]", ...a);

/** "🎂 Yusr's Birthday" belongs to Yusr. Apostrophes vary by keyboard. */
const birthdayFor = (dates, name) =>
  dates.find(
    (d) =>
      /birthday/i.test(d.title) &&
      d.title.toLowerCase().includes(name.toLowerCase()),
  );

const mmdd = (date) =>
  `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

const couples = await p.couple.findMany({
  include: { users: true },
  orderBy: { createdAt: "asc" },
});

for (const couple of couples) {
  console.log(`\n${couple.displayName}`);
  const dates = await p.specialDate.findMany({ where: { coupleId: couple.id } });

  // ── 1. Adults: adopt the birthday already recorded as a special date ──
  for (const member of couple.users.filter((u) => u.kind === "adult")) {
    if (member.birthday) continue;
    const hit = birthdayFor(dates, member.name);
    if (!hit) continue;
    log(`  ${member.name}: birthday ${mmdd(hit.date)} from "${hit.title}"`);
    if (COMMIT) {
      await p.coupleUser.update({ where: { id: member.id }, data: { birthday: mmdd(hit.date) } });
    }
  }

  // ── 2. childName becomes a member ──
  let child = couple.users.find((u) => u.kind === "child");
  if (!child && couple.childName?.trim()) {
    const name = couple.childName.trim();
    const hit = birthdayFor(dates, name);
    log(`  ${name}: new child member${hit ? `, birthday ${mmdd(hit.date)}` : ", no birthday found"}`);
    if (COMMIT) {
      child = await p.coupleUser.create({
        data: {
          coupleId: couple.id,
          kind: "child",
          role: null, // null is what lets several children coexist
          email: null,
          name,
          birthday: hit ? mmdd(hit.date) : null,
        },
      });
    }
  } else if (child) {
    log(`  ${child.name}: already a member`);
  }

  // ── 3. Events tagged "child" point at that member ──
  const generic = await p.calendarEvent.count({
    where: { coupleId: couple.id, personTag: "child" },
  });
  if (generic > 0) {
    log(`  ${generic} event(s) tagged "child" -> ${child?.name ?? "(pending)"}`);
    if (COMMIT && child) {
      await p.calendarEvent.updateMany({
        where: { coupleId: couple.id, personTag: "child" },
        data: { personTag: child.id },
      });
    }
  }

  // ── 4. Birthdays and anniversaries mislabelled "other" ──
  for (const d of dates) {
    const want = /birthday/i.test(d.title)
      ? "birthday"
      : /anniversary/i.test(d.title)
        ? "anniversary"
        : /together/i.test(d.title)
          ? "milestone"
          : null;
    if (!want || d.kind === want) continue;
    log(`  "${d.title}": kind ${d.kind} -> ${want}`);
    if (COMMIT) await p.specialDate.update({ where: { id: d.id }, data: { kind: want } });
  }
}

// ── 5. The founding family keeps the right to invite others ──
const founder = couples[0];
if (founder && !founder.canInviteFamilies) {
  log(`\n${founder.displayName}: may invite new families`);
  if (COMMIT) {
    await p.couple.update({ where: { id: founder.id }, data: { canInviteFamilies: true } });
  }
}

console.log(COMMIT ? "\nDone." : "\nDry run — nothing written. Re-run with --commit.");
await p.$disconnect();
