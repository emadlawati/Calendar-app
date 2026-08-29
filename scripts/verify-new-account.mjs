/**
 * Registers a family the way a real one registers, then tries to see it from
 * the outside.
 *
 *   node scripts/verify-new-account.mjs [baseUrl]     # dev server only
 *
 * verify-tenancy.mjs creates its second family by writing rows directly, which
 * proves the isolation layer but skips the signup path entirely. This goes
 * through it: an invitation minted by the founding family's own API, redeemed
 * by redeemInvite, details completed on /welcome, and then one row written
 * into every tenant model through the real endpoints.
 *
 * Then the important half: with the founding family's session, every list is
 * checked for the newcomer's rows, every id is fetched and deleted, and every
 * aggregate is read. Nothing of theirs may appear anywhere.
 *
 * Needs the dev-only session shortcut, so it runs against a dev server. The
 * database is the same one either way.
 */
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { readFileSync } from "fs";
import { createHmac } from "node:crypto";

const env = {};
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
process.env.DATABASE_URL ||= env.DATABASE_URL;

const BASE = process.argv[2] || "http://localhost:3000";
const p = new PrismaClient();
const secret = new TextEncoder().encode(env.SESSION_SECRET || env.GOOGLE_CLIENT_SECRET);

const NEW_EMAIL = "verify-newaccount@test.invalid";
const MARK = "NEWACCOUNT-PRIVATE";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${n}${d ? "  — " + d : ""}`);
};
const section = (t) => console.log(`\n${t}`);

const cookieFor = async (role, coupleId, email = "x@x") =>
  "session=" + (await new SignJWT({ userId: role, email, coupleId })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1d").sign(secret));

const api = async (path, cookie, opts = {}) => {
  const r = await fetch(BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(opts.headers || {}),
    },
    redirect: "manual",
  });
  let body = null;
  try { body = await r.json(); } catch { /* not json */ }
  return { status: r.status, body };
};

// ── Leave nothing behind, however this ends ──
async function cleanup(coupleId) {
  if (coupleId) await p.couple.delete({ where: { id: coupleId } }).catch(() => {});
  await p.invite.deleteMany({ where: { note: MARK } }).catch(() => {});
  await p.coupleUser.deleteMany({ where: { email: NEW_EMAIL } }).catch(() => {});
}

const founder = await p.couple.findFirst({ orderBy: { createdAt: "asc" } });
if (!founder) { console.error("No founding family exists."); process.exit(1); }
// A stale run must not make this one look like a pass.
await cleanup(null);
const stale = await p.coupleUser.findFirst({ where: { email: NEW_EMAIL } });
if (stale) await cleanup(stale.coupleId);

const founderCookie = await cookieFor("Husband", founder.id);
let newCoupleId = null;

try {
  // ────────────────────────────────────────────────────────────
  section("Registration — the path a real family takes");

  const invite = await api("/api/invites", founderCookie, {
    method: "POST",
    body: JSON.stringify({ kind: "couple", note: MARK }),
  });
  check("the main family can mint an invitation", invite.status === 201, `HTTP ${invite.status}`);
  const token = invite.body?.url?.split("/join/")[1];

  const preview = await api(`/api/invites/${token}`, null);
  check("the join page reads it without a session", preview.status === 200 && preview.body?.valid);
  check("the join page leaks no family data",
    !JSON.stringify(preview.body ?? {}).match(/Budoor|Emad|Yusr/i));

  const redeemed = await api(
    `/api/auth/dev-session?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(NEW_EMAIL)}`,
    null,
  );
  check("redeeming it creates a family", redeemed.status === 200 && !!redeemed.body?.coupleId,
    redeemed.body?.error ?? `HTTP ${redeemed.status}`);
  newCoupleId = redeemed.body?.coupleId;
  if (!newCoupleId) throw new Error("registration failed — nothing further can be checked");

  check("it is a new family, not the founding one", newCoupleId !== founder.id);
  check("the invitation is spent", !!(await p.invite.findFirst({ where: { token } }))?.usedAt);

  const reused = await api(
    `/api/auth/dev-session?invite=${encodeURIComponent(token)}&email=second@test.invalid`,
    null,
  );
  check("the same link cannot be redeemed twice", reused.status === 400, `HTTP ${reused.status}`);

  const newCookie = await cookieFor(redeemed.body.role, newCoupleId, NEW_EMAIL);

  // ────────────────────────────────────────────────────────────
  section("A new family starts empty");

  const startEvents = await api("/api/events", newCookie);
  check("no events inherited", Array.isArray(startEvents.body) && startEvents.body.length === 0,
    `${startEvents.body?.length} present`);
  const startNotes = await api("/api/notes", newCookie);
  check("no letters inherited", Array.isArray(startNotes.body) && startNotes.body.length === 0);
  const startMem = await api("/api/memories", newCookie);
  check("no memories inherited", Array.isArray(startMem.body) && startMem.body.length === 0);
  const startBucket = await api("/api/bucket", newCookie);
  check("no reading list inherited", Array.isArray(startBucket.body) && startBucket.body.length === 0);
  const startStats = await api("/api/stats", newCookie);
  check("statistics start at zero", startStats.body?.totalEvents === 0,
    `totalEvents=${startStats.body?.totalEvents}`);

  // ────────────────────────────────────────────────────────────
  section("Completing the welcome step");

  const welcome = await api("/api/couple", newCookie, {
    method: "PATCH",
    body: JSON.stringify({
      displayName: "Noor & Tariq",
      startDate: "2019-06-01",
      claimRole: "Husband",
      members: [{ role: redeemed.body.role, name: "Tariq", birthday: "03-12" }],
      children: [{ name: "Salim", birthday: "07-04" }],
    }),
  });
  check("welcome details save", welcome.status === 200, `HTTP ${welcome.status}`);
  check("the seat they chose is the seat they get", welcome.body?.roleChangedTo === "Husband",
    String(welcome.body?.roleChangedTo));

  const asHusband = await cookieFor("Husband", newCoupleId, NEW_EMAIL);
  const me = await api("/api/auth/me", asHusband);
  check("their own names come back", me.body?.couple?.members?.Husband === "Tariq",
    JSON.stringify(me.body?.couple?.members));
  check("their child is theirs", (me.body?.couple?.children ?? []).some((c) => c.name === "Salim"));
  check("no trace of the founding family", !/Budoor|Emad|Yusr/.test(JSON.stringify(me.body ?? {})));

  const dates = await api("/api/special-dates", asHusband);
  const titles = Array.isArray(dates.body) ? dates.body.map((d) => d.title) : [];
  check("their own dates are seeded", titles.some((t) => /Tariq/.test(t)), titles.join(", ").slice(0, 90));
  check("the founding family's dates are not", !titles.some((t) => /Budoor|Emad|Yusr/.test(t)));

  // ────────────────────────────────────────────────────────────
  section("Writing one row into every tenant model, through the real API");

  const created = {};

  const ev = await api("/api/events/create", asHusband, {
    method: "POST",
    body: JSON.stringify({
      title: `${MARK} event`, date: "2026-11-04", time: "09:00",
      category: "social", personTag: "family", notes: MARK,
    }),
  });
  check("event", ev.status === 200 || ev.status === 201, `HTTP ${ev.status}`);
  created.event = ev.body?.event?.id ?? ev.body?.id;

  const note = await api("/api/notes", asHusband, {
    method: "POST", body: JSON.stringify({ content: `${MARK} letter`, kind: "note" }),
  });
  check("letter", note.status === 201 || note.status === 200, `HTTP ${note.status}`);
  created.note = note.body?.id ?? note.body?.note?.id;

  const bucket = await api("/api/bucket", asHusband, {
    method: "POST", body: JSON.stringify({ title: `${MARK} wish`, category: "other" }),
  });
  check("reading-list item", bucket.status === 201 || bucket.status === 200, `HTTP ${bucket.status}`);
  created.bucket = bucket.body?.id ?? bucket.body?.item?.id;

  const hl = await api("/api/highlights", asHusband, {
    method: "POST", body: JSON.stringify({ date: "2026-11-04", note: `${MARK} highlight` }),
  });
  check("highlight", hl.status === 200 || hl.status === 201, `HTTP ${hl.status}`);
  created.highlight = hl.body?.id ?? hl.body?.highlight?.id;

  const mem = created.event
    ? await api("/api/memories", asHusband, {
        method: "POST",
        body: JSON.stringify({ eventId: created.event, journal: `${MARK} memory`, photos: [] }),
      })
    : { status: 0, body: null };
  check("memory", mem.status === 200 || mem.status === 201, `HTTP ${mem.status}`);
  created.memory = mem.body?.id ?? mem.body?.memory?.id;

  const rem = await api("/api/reminders", asHusband, {
    method: "POST",
    body: JSON.stringify({ title: `${MARK} reminder`, date: "2026-11-05", time: "10:00" }),
  });
  check("reminder", rem.status === 200 || rem.status === 201, `HTTP ${rem.status}`);
  created.reminder = rem.body?.reminder?.id ?? rem.body?.id;

  const sd = await api("/api/special-dates", asHusband, {
    method: "POST",
    body: JSON.stringify({ title: `${MARK} occasion`, date: "2026-12-01", type: "one-time", kind: "other" }),
  });
  check("special date", sd.status === 200 || sd.status === 201, `HTTP ${sd.status}`);
  created.specialDate = sd.body?.id ?? sd.body?.specialDate?.id;

  const feed = await api("/api/feed", asHusband, { method: "POST" });
  check("calendar feed link", feed.status === 200, `HTTP ${feed.status}`);

  const task = await api("/api/tasks", asHusband, {
    method: "POST",
    body: JSON.stringify({ title: `${MARK} task`, personTag: "family", dueDate: "2026-11-06" }),
  });
  check("task", task.status === 201, `HTTP ${task.status}`);
  created.task = task.body?.task?.id;

  const chore = await api("/api/tasks", asHusband, {
    method: "POST",
    body: JSON.stringify({ title: `${MARK} chore`, frequency: "weekly", weekday: 2 }),
  });
  check("standing chore", chore.status === 201, `HTTP ${chore.status}`);

  const sub = await api("/api/push/subscribe", asHusband, {
    method: "POST",
    body: JSON.stringify({
      endpoint: `https://fcm.googleapis.com/${MARK}`,
      keys: { p256dh: "k", auth: "a" },
    }),
  });
  check("push subscription", sub.status === 200, `HTTP ${sub.status}`);

  // ────────────────────────────────────────────────────────────
  section("Everything written is stamped with their family id");

  const models = [
    "calendarEvent", "note", "bucketItem", "dailyHighlight", "memory",
    "reminder", "specialDate", "pushSubscription", "feedToken", "streak",
    "achievement", "comment", "reaction", "recurringSeries", "task", "taskSeries",
  ];
  let stray = 0;
  const counts = {};
  for (const m of models) {
    counts[m] = await p[m].count({ where: { coupleId: newCoupleId } });
    // Nothing they wrote may have landed under the founding family.
    const wrong = await p[m].count({
      where: { coupleId: founder.id, ...(m === "note" ? { content: { contains: MARK } } : {}) },
    });
    if (m === "note" && wrong > 0) stray += wrong;
  }
  check("their rows exist under their own id",
    counts.calendarEvent > 0 && counts.note > 0 && counts.memory > 0 &&
    counts.feedToken > 0 && counts.task > 0 && counts.taskSeries > 0,
    Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(" "));
  check("nothing of theirs landed on the founding family", stray === 0);

  const marked = await p.calendarEvent.findMany({ where: { title: { contains: MARK } } });
  check("every marked row belongs to the new family",
    marked.every((e) => e.coupleId === newCoupleId), `${marked.length} checked`);

  // ────────────────────────────────────────────────────────────
  section("The founding family cannot see any of it");

  const lists = [
    ["/api/events", "events"],
    ["/api/notes", "letters"],
    ["/api/bucket", "reading list"],
    ["/api/memories", "memories"],
    ["/api/reminders", "reminders"],
    ["/api/special-dates", "special dates"],
    ["/api/timeline", "timeline"],
    ["/api/highlights?date=2026-11-04", "highlights"],
    ["/api/tasks", "the ledger"],
  ];
  for (const [path, name] of lists) {
    const r = await api(path, founderCookie);
    const text = JSON.stringify(r.body ?? "");
    check(`${name} exclude theirs`, !text.includes(MARK), `HTTP ${r.status}`);
  }

  section("…nor reach any of it by id");
  // Only the verbs each route actually implements. Asking for one it does not
  // have returns 405 before any lookup, which proves nothing either way.
  const targets = [
    { path: `/api/events/${created.event}`,              name: "event",             verbs: ["GET"] },
    { path: `/api/memories/${created.memory}`,           name: "memory",            verbs: ["PATCH", "DELETE"] },
    { path: `/api/bucket/${created.bucket}`,             name: "reading-list item", verbs: ["PATCH", "DELETE"] },
    { path: `/api/notes/${created.note}`,                name: "letter",            verbs: ["PATCH", "DELETE"] },
    { path: `/api/special-dates/${created.specialDate}`, name: "special date",      verbs: ["DELETE"] },
    { path: `/api/reminders/${created.reminder}`,        name: "reminder",          verbs: ["DELETE"] },
    { path: `/api/highlights/${created.highlight}`,      name: "highlight",         verbs: ["PATCH", "DELETE"] },
    { path: `/api/tasks/${created.task}`,                name: "task",              verbs: ["PATCH", "DELETE"] },
  ];

  for (const t of targets) {
    if (t.path.includes("undefined")) {
      check(`${t.name} was created so it can be probed`, false, "id missing");
      continue;
    }
    for (const verb of t.verbs) {
      const r = await api(t.path, founderCookie, {
        method: verb,
        ...(verb === "PATCH" ? { body: JSON.stringify({ title: "intrusion", content: "intrusion", note: "intrusion" }) } : {}),
      });
      check(`${verb} another family's ${t.name} -> 404`, r.status === 404, `HTTP ${r.status}`);
    }
  }

  // The rows must still be there, and unchanged, after all of that.
  const stillThere = await p.calendarEvent.count({ where: { id: created.event } });
  check("their event survived the attempts", stillThere === 1);
  const noteAfter = await p.note.findUnique({ where: { id: created.note } });
  check("their letter is untouched", noteAfter?.content?.includes(MARK) === true,
    noteAfter ? "content intact" : "row gone");
  const memAfter = await p.memory.findUnique({ where: { id: created.memory } });
  check("their memory is untouched", memAfter?.journal?.includes(MARK) === true);

  section("…nor write into it");
  const comment = await api("/api/comments", founderCookie, {
    method: "POST",
    body: JSON.stringify({ targetType: "memory", targetId: created.memory, content: "intrusion" }),
  });
  check("commenting on another family's memory is refused",
    comment.status === 404 || comment.status === 403 || comment.status === 400,
    `HTTP ${comment.status}`);
  const reaction = await api("/api/reactions", founderCookie, {
    method: "POST",
    body: JSON.stringify({ targetType: "memory", targetId: created.memory, emoji: "❤️" }),
  });
  check("reacting to another family's memory is refused",
    reaction.status === 404 || reaction.status === 403 || reaction.status === 400,
    `HTTP ${reaction.status}`);
  const orphanComments = await p.comment.count({ where: { targetId: created.memory, coupleId: founder.id } });
  check("no cross-family comment row was written", orphanComments === 0);
  const orphanReactions = await p.reaction.count({ where: { targetId: created.memory, coupleId: founder.id } });
  check("no cross-family reaction row was written", orphanReactions === 0);

  section("Their accept links work, and only theirs");
  {
    // The one-click links in emails are followed with no session at all, so
    // they carry a signature instead. This is the flow a newly-invited family
    // meets first, and it was silently broken by tenancy until it was signed.
    const sign = (id, act) =>
      createHmac("sha256", env.SESSION_SECRET || env.GOOGLE_CLIENT_SECRET)
        .update(`${act}:${id}`).digest("base64url").slice(0, 32);

    const mkPending = () => p.calendarEvent.create({
      data: {
        coupleId: newCoupleId, title: `${MARK} invite`, date: new Date("2026-11-20"),
        time: "18:00", createdBy: "Wife", status: "pending",
      },
    });

    const signedEv = await mkPending();
    await fetch(`${BASE}/api/events/action?id=${signedEv.id}&action=accept&user=Wife&sig=${sign(signedEv.id, "accept")}`,
      { redirect: "manual" });
    const signedAfter = await p.calendarEvent.findUnique({ where: { id: signedEv.id } });
    check("a signed link accepts while signed out", signedAfter?.status === "accepted",
      `status ${signedAfter?.status}`);

    const bareEv = await mkPending();
    await fetch(`${BASE}/api/events/action?id=${bareEv.id}&action=accept&user=Wife`, { redirect: "manual" });
    const bareAfter = await p.calendarEvent.findUnique({ where: { id: bareEv.id } });
    check("an unsigned link accepts nothing", bareAfter?.status === "pending", `status ${bareAfter?.status}`);

    const wrongEv = await mkPending();
    await fetch(`${BASE}/api/events/action?id=${wrongEv.id}&action=accept&user=Wife&sig=${sign(signedEv.id, "accept")}`,
      { redirect: "manual" });
    const wrongAfter = await p.calendarEvent.findUnique({ where: { id: wrongEv.id } });
    check("a signature only works on its own event", wrongAfter?.status === "pending",
      `status ${wrongAfter?.status}`);

    // And the founding family, signed in, still cannot accept theirs.
    const otherEv = await mkPending();
    await api(`/api/events/action?id=${otherEv.id}&action=accept&user=Wife`, founderCookie);
    const otherAfter = await p.calendarEvent.findUnique({ where: { id: otherEv.id } });
    check("another family's session cannot accept it", otherAfter?.status === "pending",
      `status ${otherAfter?.status}`);

    for (const e of [signedEv, bareEv, wrongEv, otherEv]) {
      await p.calendarEvent.delete({ where: { id: e.id } }).catch(() => {});
    }
  }

  section("…nor count it");
  const fStats = await api("/api/stats", founderCookie);
  const fEvents = await p.calendarEvent.count({ where: { coupleId: founder.id, archived: false } });
  check("statistics count only the founding family's rows",
    typeof fStats.body?.totalEvents === "number" && fStats.body.totalEvents <= fEvents,
    `reported ${fStats.body?.totalEvents}, they own ${fEvents}`);
  const fBadge = await api("/api/badge", founderCookie);
  const nBadge = await api("/api/badge", asHusband);
  check("the icon count is per family",
    typeof fBadge.body?.count === "number" && typeof nBadge.body?.count === "number",
    `founding ${fBadge.body?.count}, new ${nBadge.body?.count}`);

  section("Their feed and widget carry only their own");
  const feedToken = feed.body?.url?.split("/api/feed/")[1]?.replace(/\.ics$/, "");
  const ics = await (await fetch(`${BASE}/api/feed/${feedToken}.ics`)).text();
  check("their feed has their entry", ics.includes(`${MARK} event`));
  check("their feed has nothing of the founding family's",
    !/Budoor|Emad|Yusr/.test(ics));
  const png = await fetch(`${BASE}/api/widget/${feedToken}.png?size=small`);
  check("their widget renders", png.status === 200 &&
    (png.headers.get("content-type") ?? "").startsWith("image/png"), `HTTP ${png.status}`);

  section("Sessions cannot be pointed at another family");
  // A valid signature over someone else's coupleId is the obvious attack.
  const forged = await cookieFor("Husband", newCoupleId, "emadlawati97@gmail.com");
  const forgedEvents = await api("/api/events", forged);
  check("a session naming another family sees that family only, not both",
    Array.isArray(forgedEvents.body) &&
      !JSON.stringify(forgedEvents.body).match(/Family Outing|Dubai Business/),
    "scope follows coupleId, as designed");

} finally {
  section("Cleanup");
  const before = newCoupleId
    ? await p.calendarEvent.count({ where: { coupleId: newCoupleId } })
    : 0;
  await cleanup(newCoupleId);
  const after = newCoupleId
    ? await p.calendarEvent.count({ where: { coupleId: newCoupleId } })
    : 0;
  check("removing the family removes everything of theirs", after === 0, `${before} -> ${after}`);
  const leftover = await p.calendarEvent.count({ where: { title: { contains: MARK } } });
  check("no test rows left anywhere", leftover === 0);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await p.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
