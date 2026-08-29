/**
 * Tenancy regression suite.
 *
 *   node scripts/verify-tenancy.mjs [baseUrl]
 *
 * Creates a throwaway second couple whose data deliberately collides with the
 * real one (same highlight date, same role), exercises the live API as each,
 * then deletes it. Safe to run against a dev server; it never mutates couple
 * #1 beyond a single highlight it restores.
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
const SHARED_DATE = "2026-08-20";

const cookieFor = async (role, coupleId) =>
  "session=" + (await new SignJWT({ userId: role, email: `verify-${role}@x`, coupleId })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1d").sign(secret));

const api = async (path, cookie, opts = {}) => {
  const r = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(opts.headers || {}) },
    redirect: "manual",
  });
  let b = null; try { b = await r.json(); } catch {}
  return { status: r.status, body: b };
};

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { ok ? pass++ : fail++; console.log(`${ok ? "  ok  " : "  FAIL"}  ${n}${d ? "  — " + d : ""}`); };
const section = (t) => console.log(`\n${t}`);

const A = await p.couple.findFirst({ orderBy: { createdAt: "asc" } });
if (!A) { console.error("No couple exists — run scripts/backfill-tenancy.mjs first."); process.exit(1); }

// Couple A keeps a highlight on the shared date, so the collision is real.
let aHl = await p.dailyHighlight.findFirst({ where: { coupleId: A.id, date: SHARED_DATE, createdBy: "Husband" } });
// A row that already reads A-ORIGINAL is this script's own fixture, left by a
// run that died before cleanup. Adopt it for deletion — otherwise the next run
// mistakes it for real data and preserves it in the couple's history forever.
const aHlExisted = !!aHl && aHl.note !== "A-ORIGINAL";
const aHlOriginal = aHlExisted ? aHl.note : null;
if (!aHl) {
  aHl = await p.dailyHighlight.create({ data: { coupleId: A.id, date: SHARED_DATE, createdBy: "Husband", note: "A-ORIGINAL" } });
} else {
  await p.dailyHighlight.update({ where: { id: aHl.id }, data: { note: "A-ORIGINAL" } });
}

const B = await p.couple.create({
  data: {
    displayName: "Sara & Omar",
    startDate: new Date("2021-03-14"),
    canInviteFamilies: false,
    users: {
      create: [
        { role: "Wife", kind: "adult", email: "verify-sara@test.invalid", name: "Sara", birthday: "04-09" },
        { role: "Husband", kind: "adult", email: "verify-omar@test.invalid", name: "Omar", birthday: "11-22" },
        { role: null, kind: "child", email: null, name: "Layla", birthday: "02-14" },
        { role: null, kind: "child", email: null, name: "Zayd", birthday: "09-30" },
      ],
    },
  },
});
const bEvent = await p.calendarEvent.create({
  data: { coupleId: B.id, title: "B-SECRET-EVENT", date: new Date("2026-09-15"), time: "10:00", createdBy: "Wife", status: "accepted" },
});
const bNote = await p.note.create({ data: { coupleId: B.id, content: "B-SECRET-LETTER", kind: "note", createdBy: "Wife" } });
const bBucket = await p.bucketItem.create({ data: { coupleId: B.id, title: "B-SECRET-BUCKET", createdBy: "Wife" } });

const aCookie = await cookieFor("Husband", A.id);
const bCookie = await cookieFor("Husband", B.id);
console.log(`\nA: ${A.displayName} (${A.id.slice(0, 8)})   B: ${B.displayName} (${B.id.slice(0, 8)})`);

section("Isolation — lists");
const aEvents = await api("/api/events", aCookie);
check("A's events exclude B's", Array.isArray(aEvents.body) && !aEvents.body.some((e) => e.title === "B-SECRET-EVENT"));
const bEvents = await api("/api/events", bCookie);
check("B sees only its own event", Array.isArray(bEvents.body) && bEvents.body.length === 1);
const aNotes = await api("/api/notes", aCookie);
check("A's letters exclude B's", Array.isArray(aNotes.body) && !aNotes.body.some((n) => n.content === "B-SECRET-LETTER"));
const aBucket = await api("/api/bucket", aCookie);
check("A's reading list excludes B's", Array.isArray(aBucket.body) && !aBucket.body.some((i) => i.title === "B-SECRET-BUCKET"));

section("Isolation — direct access by id");
const steal = await api(`/api/events/${bEvent.id}`, aCookie);
check("GET another couple's event id -> 404", steal.status === 404, `HTTP ${steal.status}`);
const delBucket = await api(`/api/bucket/${bBucket.id}`, aCookie, { method: "DELETE" });
check("DELETE another couple's item -> 404 and survives",
  delBucket.status === 404 && !!(await p.bucketItem.findUnique({ where: { id: bBucket.id } })), `HTTP ${delBucket.status}`);
const delNote = await api(`/api/notes/${bNote.id}`, aCookie, { method: "DELETE" });
check("DELETE another couple's letter -> 404 and survives",
  delNote.status === 404 && !!(await p.note.findUnique({ where: { id: bNote.id } })), `HTTP ${delNote.status}`);

section("The destructive collision");
await api("/api/highlights", bCookie, { method: "POST", body: JSON.stringify({ date: SHARED_DATE, note: "B-WROTE-THIS" }) });
const aAfter = await p.dailyHighlight.findFirst({ where: { coupleId: A.id, date: SHARED_DATE, createdBy: "Husband" } });
const bAfter = await p.dailyHighlight.findFirst({ where: { coupleId: B.id, date: SHARED_DATE, createdBy: "Husband" } });
check("B writing the same date/role leaves A's intact", aAfter?.note === "A-ORIGINAL", `A's note: ${aAfter?.note}`);
check("B's own highlight exists separately", bAfter?.note === "B-WROTE-THIS");

section("Identity comes from the couple, not env");
const meB = await api("/api/auth/me", bCookie);
check("B sees its own names", meB.body?.couple?.members?.Wife === "Sara" && meB.body?.couple?.members?.Husband === "Omar",
  JSON.stringify(meB.body?.couple?.members));
check("B sees its own start date", String(meB.body?.couple?.startDate).startsWith("2021-03-14"));
const kidsB = meB.body?.couple?.children ?? [];
check("B sees both of its children", kidsB.length === 2 && kidsB.some((k) => k.name === "Layla") && kidsB.some((k) => k.name === "Zayd"),
  kidsB.map((k) => k.name).join(", "));
const meA = await api("/api/auth/me", aCookie);
check("A sees none of B's children",
  !(meA.body?.couple?.children ?? []).some((k) => ["Layla", "Zayd"].includes(k.name)));
const sdB = await api("/api/special-dates", bCookie);
const titlesB = Array.isArray(sdB.body) ? sdB.body.map((d) => d.title) : [];
check("B's special dates seed under B's names", titlesB.some((t) => t.includes("Sara")) && titlesB.some((t) => t.includes("Omar")));
check("B's children get birthdays too", titlesB.some((t) => t.includes("Layla")) && titlesB.some((t) => t.includes("Zayd")),
  titlesB.filter((t) => /Layla|Zayd/.test(t)).join(", "));
check("B's dates carry no trace of couple A", !titlesB.some((t) => /Budoor|Emad|Yusr/.test(t)));

section("Aggregates and tokens");
const bStats = await api("/api/stats", bCookie);
check("B's stats count only B's rows", bStats.body?.totalEvents === 1, `totalEvents=${bStats.body?.totalEvents}`);
await p.googleCalendarToken.create({ data: { coupleId: B.id, userId: "Husband", accessToken: "tok", email: "verify-omar@test.invalid" } });
check("both couples can hold a Husband Google token",
  (await p.googleCalendarToken.count({ where: { userId: "Husband" } })) >= 2);

section("Invitations");
const inv = await api("/api/invites", aCookie, { method: "POST", body: JSON.stringify({ kind: "couple" }) });
check("the main family can invite a family", inv.status === 201, `HTTP ${inv.status}`);
const bInv = await api("/api/invites", bCookie, { method: "POST", body: JSON.stringify({ kind: "couple" }) });
check("other families cannot invite families", bInv.status === 403, `HTTP ${bInv.status}`);
const token = inv.body?.url?.split("/join/")[1];
const anon = await api(`/api/invites/${token}`, null);
check("join page reads the invite without a session", anon.status === 200 && anon.body?.valid);
check("POST /api/invites is not public",
  [401, 307].includes((await api("/api/invites", null, { method: "POST", body: "{}" })).status));

section("Children and notifications");
{
  const kid = kidsB[0];
  const tagged = await p.calendarEvent.create({
    data: { coupleId: B.id, title: "B-CHILD-EVENT", date: new Date("2026-10-01"), time: "09:00",
            createdBy: "Wife", status: "accepted", personTag: kid?.id ?? "child" },
  });
  const seen = await api("/api/events", aCookie);
  check("an event tagged to B's child is invisible to A",
    Array.isArray(seen.body) && !seen.body.some((e) => e.title === "B-CHILD-EVENT"));
  const own = await api("/api/events", bCookie);
  const found = Array.isArray(own.body) && own.body.find((e) => e.title === "B-CHILD-EVENT");
  check("the child tag survives the round trip", !!found && found.personTag === kid?.id);
  await p.calendarEvent.delete({ where: { id: tagged.id } });
}

section("Push subscriptions cannot straddle families");
{
  const endpoint = "https://fcm.googleapis.com/verify-shared-device";
  await p.pushSubscription.deleteMany({ where: { endpoint } });
  await p.pushSubscription.create({
    data: { coupleId: A.id, userId: "Husband", endpoint, keys: JSON.stringify({ p256dh: "x", auth: "y" }) },
  });
  // The same phone now registers under family B.
  const res = await api("/api/push/subscribe", bCookie, {
    method: "POST",
    body: JSON.stringify({ endpoint, keys: { p256dh: "new", auth: "new" } }),
  });
  const rows = await p.pushSubscription.findMany({ where: { endpoint } });
  check("re-registering moves the device rather than editing A's row",
    res.status === 200 && rows.length === 1 && rows[0].coupleId === B.id,
    `HTTP ${res.status}, ${rows.length} row(s), owner ${rows[0]?.coupleId === B.id ? "B" : "A"}`);
  await p.pushSubscription.deleteMany({ where: { endpoint } });
}

section("Settings cannot cross tenants");
await api("/api/couple", bCookie, { method: "PATCH", body: JSON.stringify({ displayName: "HIJACKED" }) });
check("A's name is untouched", (await p.couple.findUnique({ where: { id: A.id } })).displayName !== "HIJACKED");

// ── cleanup ──
await p.couple.delete({ where: { id: B.id } });
if (token) await p.invite.deleteMany({ where: { token } });
if (aHlExisted) await p.dailyHighlight.update({ where: { id: aHl.id }, data: { note: aHlOriginal } });
else await p.dailyHighlight.delete({ where: { id: aHl.id } }).catch(() => {});
const leftovers = await p.calendarEvent.count({ where: { coupleId: B.id } })
  + await p.note.count({ where: { coupleId: B.id } })
  + await p.dailyHighlight.count({ where: { coupleId: B.id } });
section("Cleanup");
check("deleting a couple cascades its rows away", leftovers === 0, `${leftovers} left`);

console.log(`\n${pass} passed, ${fail} failed\n`);
await p.$disconnect();
process.exit(fail === 0 ? 0 : 1);
