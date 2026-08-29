/**
 * Turns on row-level security for every table that belongs to a family.
 *
 *   node scripts/enable-rls.mjs [--commit]
 *
 * Isolation was enforced in one place in the application. This adds a second,
 * independent place: the database itself refuses to return another family's
 * rows, whatever the query asks for.
 *
 * How it works here, and why it is shaped this way:
 *
 * Prisma Postgres connects the app as `prisma_migration`, which is a
 * superuser — and superusers bypass RLS unconditionally, even with FORCE. The
 * platform will not let us create a role, or grant to one. But it already
 * ships `prisma_application`: no superuser, no BYPASSRLS, and already holding
 * select/insert/update/delete on these tables. So the scoped client drops into
 * that role for the duration of each transaction, and the policy applies.
 *
 * The policy reads `app.couple_id`, set transaction-locally alongside it. With
 * no setting, current_setting(...) returns NULL, nothing matches, and a query
 * returns nothing — it fails closed rather than open.
 *
 * Idempotent. Safe to run repeatedly.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const COMMIT = process.argv.includes("--commit");
const p = new PrismaClient();

/** Every table carrying a coupleId. Must match TENANT_MODELS in lib/prisma.ts. */
const TABLES = [
  "CalendarEvent", "GoogleCalendarToken", "Note", "BucketItem", "Streak",
  "Achievement", "Memory", "RecurringSeries", "SpecialDate", "Reminder",
  "DailyHighlight", "PushSubscription", "Comment", "Reaction", "FeedToken",
  "Task", "TaskSeries",
  // Not in TENANT_MODELS — only ever read through systemPrisma, which resolves
  // a login email to a family before any scope exists. Protected anyway: it
  // holds names, emails and birthdays, and a policy costs nothing here.
  "CoupleUser",
];

/**
 * Tables with a coupleId that deliberately stay open, and why. Listed so the
 * guard below still catches a table nobody thought about.
 */
const EXCLUDED = {
  Invite:
    "an invitation to a brand-new family has no coupleId yet, so no tenant " +
    "policy can describe it; it is only ever looked up by its token, through " +
    "systemPrisma",
};

const POLICY = "tenant_isolation";

// Guard against a table drifting out of the list above.
const withCoupleId = await p.$queryRawUnsafe(`
  select table_name from information_schema.columns
  where table_schema = 'public' and column_name = 'coupleId'
  order by table_name`);
const actual = withCoupleId.map((r) => r.table_name);
const missing = actual.filter((t) => !TABLES.includes(t) && !(t in EXCLUDED));
if (missing.length) {
  console.error(`\nThese tables have a coupleId but are neither protected nor`);
  console.error(`explicitly excluded: ${missing.join(", ")}`);
  console.error("Decide about them before running, rather than leaving it to chance.\n");
  process.exit(1);
}
console.log(`${actual.length} tables carry a coupleId.`);
for (const [t, why] of Object.entries(EXCLUDED)) {
  console.log(`  ${t} is deliberately left open — ${why}.`);
}
console.log();

for (const table of TABLES) {
  const [state] = await p.$queryRawUnsafe(
    `select relrowsecurity as enabled, relforcerowsecurity as forced
     from pg_class where relname = '${table}'`,
  );
  const [existing] = await p.$queryRawUnsafe(
    `select count(*)::int as n from pg_policies
     where tablename = '${table}' and policyname = '${POLICY}'`,
  );

  const todo = [];
  if (!state?.enabled) todo.push("enable RLS");
  if (!state?.forced) todo.push("force RLS");
  if (!existing?.n) todo.push("add policy");

  if (todo.length === 0) {
    console.log(`  ${table.padEnd(22)} already protected`);
    continue;
  }
  console.log(`  ${table.padEnd(22)} ${COMMIT ? "" : "would "}${todo.join(", ")}`);
  if (!COMMIT) continue;

  await p.$executeRawUnsafe(`alter table "${table}" enable row level security`);
  await p.$executeRawUnsafe(`alter table "${table}" force row level security`);
  await p.$executeRawUnsafe(`drop policy if exists ${POLICY} on "${table}"`);
  // USING governs what can be read, changed or removed; WITH CHECK governs
  // what may be written — without it a row could be inserted into another
  // family and then be invisible even to its author.
  await p.$executeRawUnsafe(`
    create policy ${POLICY} on "${table}"
    using ("coupleId" = current_setting('app.couple_id', true))
    with check ("coupleId" = current_setting('app.couple_id', true))`);
}

console.log(COMMIT ? "\nDone." : "\nDry run — nothing changed. Re-run with --commit.");
await p.$disconnect();
