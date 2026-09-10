/**
 * Amending where a repeating entry stops.
 *
 *   node scripts/verify-series-end.mjs [url]
 *
 * Works on a throwaway series of its own, never on real entries, and removes
 * it however this ends — the route under test deletes calendar rows, so it is
 * not something to point at a family's own repeats on trust.
 *
 * The case that matters most is the last one: an occurrence past the new end
 * that has a memory saved against it must survive, because deleting the entry
 * would take the memory and its photographs with it.
 */
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { readFileSync } from "fs";

const env = {};
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
process.env.DATABASE_URL ||= env.DATABASE_URL;

const BASE = process.argv[2] || "http://localhost:3000";
const p = new PrismaClient();
const secret = new TextEncoder().encode(env.SESSION_SECRET || env.GOOGLE_CLIENT_SECRET);
const MARK = "SERIESEND";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${n}${d ? "  — " + d : ""}`);
};
const section = (t) => console.log(`\n${t}`);

const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (base, n) => {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

let seriesId = null;
async function cleanup() {
  if (seriesId) {
    await p.memory.deleteMany({ where: { event: { seriesId } } }).catch(() => {});
    await p.calendarEvent.deleteMany({ where: { seriesId } }).catch(() => {});
    await p.recurringSeries.delete({ where: { id: seriesId } }).catch(() => {});
  }
  await p.calendarEvent.deleteMany({ where: { title: { contains: MARK } } }).catch(() => {});
}

try {
  const couple = await p.couple.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!couple) { console.error("No family exists."); process.exit(1); }

  const cookie = "session=" + (await new SignJWT({ userId: "Husband", email: "x@x", coupleId: couple.id })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1d").sign(secret));

  const api = async (path, opts = {}) => {
    const r = await fetch(BASE + path, {
      ...opts,
      headers: { "Content-Type": "application/json", Cookie: cookie, ...(opts.headers || {}) },
      redirect: "manual",
    });
    let body = null;
    try { body = await r.json(); } catch { /* not json */ }
    return { status: r.status, body };
  };

  // A weekly run starting today, ending 8 weeks out.
  const start = day(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" }));
  const firstEnd = plus(start, 56);

  section("A repeating entry, set to stop");
  const made = await api("/api/recurring", {
    method: "POST",
    body: JSON.stringify({
      title: `${MARK} weekly thing`, date: iso(start), time: "09:00",
      category: "other", allDay: false, createdBy: "Husband",
      frequency: "weekly", until: iso(firstEnd),
    }),
  });
  check("the series is created", made.status === 200 || made.status === 201, `HTTP ${made.status}`);

  const s = await p.recurringSeries.findFirst({
    where: { title: `${MARK} weekly thing` }, orderBy: { createdAt: "desc" },
  });
  seriesId = s?.id ?? null;
  check("it stored the end date it was given",
    s && iso(s.endDate) === iso(firstEnd), s ? iso(s.endDate) : "no series");

  const occ = await p.calendarEvent.findMany({
    where: { seriesId }, orderBy: { date: "asc" }, select: { id: true, date: true },
  });
  check("no occurrence falls past it",
    occ.every((e) => e.date <= firstEnd),
    `${occ.length} occurrences, last ${occ.length ? iso(occ[occ.length - 1].date) : "-"}`);

  // The first one, deliberately: it falls on the start date, so it survives
  // every shortening and stays a valid handle on the series. A middle one gets
  // deleted the moment the run is cut back, and then the next request is
  // holding an id that no longer exists.
  const anOccurrence = occ[0]?.id;

  section("Opening one of them shows the run");
  const read = await api(`/api/recurring/series?eventId=${anOccurrence}`);
  check("the series is readable from any occurrence", read.status === 200 && !!read.body?.series,
    `HTTP ${read.status}`);
  check("it reports the end date that was set",
    read.body?.series?.endDate === iso(firstEnd), String(read.body?.series?.endDate));
  check("and the frequency", read.body?.series?.frequency === "weekly");

  section("Shortening it");
  const shortEnd = plus(start, 21);
  const shortened = await api("/api/recurring/series", {
    method: "PATCH",
    body: JSON.stringify({ eventId: anOccurrence, until: iso(shortEnd) }),
  });
  check("the change is accepted", shortened.status === 200, `HTTP ${shortened.status}`);
  check("it reports what it removed", typeof shortened.body?.removed === "number",
    `removed ${shortened.body?.removed}`);

  const afterShort = await p.calendarEvent.findMany({
    where: { seriesId }, orderBy: { date: "asc" }, select: { date: true },
  });
  check("nothing is left past the new end",
    afterShort.every((e) => e.date <= shortEnd),
    `last is ${afterShort.length ? iso(afterShort[afterShort.length - 1].date) : "-"}`);
  check("the earlier occurrences are untouched", afterShort.length > 0, `${afterShort.length} left`);
  const stored = await p.recurringSeries.findFirst({ where: { id: seriesId } });
  check("the series records the new end", iso(stored.endDate) === iso(shortEnd), iso(stored.endDate));

  section("Lengthening it again");
  const longEnd = plus(start, 70);
  const lengthened = await api("/api/recurring/series", {
    method: "PATCH",
    body: JSON.stringify({ eventId: anOccurrence, until: iso(longEnd) }),
  });
  check("the change is accepted", lengthened.status === 200, `HTTP ${lengthened.status}`);
  const afterLong = await p.calendarEvent.findMany({
    where: { seriesId }, orderBy: { date: "asc" }, select: { date: true },
  });
  check("the missing occurrences are generated back",
    afterLong.length > afterShort.length,
    `${afterShort.length} -> ${afterLong.length}`);
  check("and none passes the new end",
    afterLong.every((e) => e.date <= longEnd),
    `last is ${iso(afterLong[afterLong.length - 1].date)}`);

  section("A day with a memory on it is never deleted");
  // Put a memory on the last occurrence, then shorten past it.
  const last = await p.calendarEvent.findFirst({
    where: { seriesId }, orderBy: { date: "desc" }, select: { id: true, date: true },
  });
  await p.memory.create({
    data: { coupleId: couple.id, eventId: last.id, rating: 5, journal: `${MARK} kept`, createdBy: "Husband" },
  });
  const cut = await api("/api/recurring/series", {
    method: "PATCH",
    body: JSON.stringify({ eventId: anOccurrence, until: iso(plus(start, 21)) }),
  });
  check("the change is accepted", cut.status === 200, `HTTP ${cut.status}`);
  check("it says one was kept back", cut.body?.keptWithMemories === 1,
    `keptWithMemories = ${cut.body?.keptWithMemories}`);
  const survivor = await p.calendarEvent.findFirst({ where: { id: last.id } });
  check("the occurrence still exists", !!survivor, survivor ? iso(survivor.date) : "GONE");
  const mem = await p.memory.findFirst({ where: { journal: `${MARK} kept` } });
  check("and so does the memory on it", !!mem);

  section("Nonsense is refused");
  const backwards = await api("/api/recurring/series", {
    method: "PATCH",
    body: JSON.stringify({ eventId: anOccurrence, until: iso(plus(start, -30)) }),
  });
  check("a run cannot stop before it starts", backwards.status === 400, `HTTP ${backwards.status}`);
  const oneOff = await p.calendarEvent.findFirst({
    where: { seriesId: null }, select: { id: true },
  });
  if (oneOff) {
    const nope = await api("/api/recurring/series", {
      method: "PATCH", body: JSON.stringify({ eventId: oneOff.id, until: iso(firstEnd) }),
    });
    check("a one-off entry has no run to change", nope.status === 400, `HTTP ${nope.status}`);
  }
  const anon = await fetch(`${BASE}/api/recurring/series?eventId=${anOccurrence}`, { redirect: "manual" });
  check("a stranger cannot read it", anon.status !== 200, `HTTP ${anon.status}`);

} finally {
  section("Cleanup");
  await cleanup();
  const left = await p.calendarEvent.count({ where: { title: { contains: MARK } } });
  check("no test entries left behind", left === 0, `${left} found`);
  const memLeft = await p.memory.count({ where: { journal: { contains: MARK } } });
  check("no test memories left behind", memLeft === 0, `${memLeft} found`);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await p.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
