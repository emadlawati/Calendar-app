/**
 * Checks that the database itself refuses another family's rows.
 *
 *   node scripts/verify-rls.mjs
 *
 * The application already scopes every query. This asserts the second,
 * independent layer underneath it: with row-level security in force, a query
 * that does not say which family it is for returns nothing at all.
 *
 * It also states the limit of the protection out loud, rather than leaving it
 * to be discovered: the connection string in .env belongs to a superuser, and
 * superusers bypass RLS. This defends against a mistake in the application,
 * not against someone holding that credential.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const p = new PrismaClient();
const ROLE = "prisma_application";
const POLICY = "tenant_isolation";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${n}${d ? "  — " + d : ""}`);
};
const section = (t) => console.log(`\n${t}`);

/** Run statements as the unprivileged role, optionally scoped to a family. */
const asApp = (coupleId, ...queries) =>
  p.$transaction([
    p.$executeRawUnsafe(`SET LOCAL ROLE ${ROLE}`),
    ...(coupleId
      ? [p.$executeRaw`SELECT set_config('app.couple_id', ${coupleId}, TRUE)`]
      : []),
    ...queries,
  ]);

section("The role the policies rely on");
const [role] = await p.$queryRawUnsafe(
  `select rolsuper, rolbypassrls from pg_roles where rolname = '${ROLE}'`,
);
check(`${ROLE} exists`, !!role);
check("it is not a superuser", role?.rolsuper === false);
check("it does not bypass row security", role?.rolbypassrls === false);

section("Every table with a coupleId is covered");
const tables = (
  await p.$queryRawUnsafe(`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'coupleId' order by table_name`)
).map((r) => r.table_name);

// Invite is deliberately open: an invitation to a new family has no coupleId.
const expectOpen = new Set(["Invite"]);
for (const t of tables) {
  const [c] = await p.$queryRawUnsafe(
    `select relrowsecurity as enabled, relforcerowsecurity as forced
     from pg_class where relname = '${t}'`,
  );
  const [pol] = await p.$queryRawUnsafe(
    `select count(*)::int as n from pg_policies
     where tablename = '${t}' and policyname = '${POLICY}'`,
  );
  if (expectOpen.has(t)) {
    check(`${t} is deliberately left open`, !c?.enabled, "no coupleId to key on");
  } else {
    check(`${t} enforces isolation`, !!c?.enabled && !!c?.forced && pol?.n === 1,
      `enabled:${c?.enabled} forced:${c?.forced} policy:${pol?.n}`);
  }
}

section("What the database returns");
const couples = await p.couple.findMany({ orderBy: { createdAt: "asc" }, take: 1 });
const a = couples[0];
if (!a) { console.error("No family exists to test with."); process.exit(1); }

const ownEvents = await p.calendarEvent.count({ where: { coupleId: a.id } });
const allEvents = await p.calendarEvent.count();

const [, unscoped] = await asApp(null, p.$queryRawUnsafe('select count(*)::int as n from "CalendarEvent"'));
check("a query with no family set returns nothing", unscoped[0].n === 0,
  `${unscoped[0].n} rows came back`);

const [, , scoped] = await asApp(a.id, p.$queryRawUnsafe('select count(*)::int as n from "CalendarEvent"'));
check("scoped to one family, only that family's rows", scoped[0].n === ownEvents,
  `${scoped[0].n} of ${allEvents} total`);

const [, , wrong] = await asApp(
  "00000000-0000-0000-0000-000000000000",
  p.$queryRawUnsafe('select count(*)::int as n from "CalendarEvent"'),
);
check("scoped to a family that does not exist, nothing", wrong[0].n === 0, `${wrong[0].n} rows`);

section("Writes are policed too");
try {
  await asApp(
    a.id,
    p.$executeRawUnsafe(`
      insert into "Note" (id, "coupleId", content, kind, "createdBy", "createdAt")
      values ('rls-probe-write', '00000000-0000-0000-0000-000000000000', 'x', 'note', 'Wife', now())`),
  );
  check("writing a row into another family is refused", false, "the insert succeeded");
  await p.note.delete({ where: { id: "rls-probe-write" } }).catch(() => {});
} catch (e) {
  check("writing a row into another family is refused", true,
    String(e.message).includes("row-level security") ? "blocked by policy" : "blocked");
}

section("The limit of this protection");
const superCount = await p.calendarEvent.count();
check("the credential in .env still sees everything (documented, not a bug)",
  superCount === allEvents,
  "superusers bypass RLS — this guards against application mistakes, not a stolen connection string");

console.log(`\n${pass} passed, ${fail} failed\n`);
await p.$disconnect();
process.exit(fail === 0 ? 0 : 1);
