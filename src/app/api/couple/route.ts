import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { systemPrisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/session";

/**
 * The family's own record — everything that used to be environment
 * configuration. systemPrisma is right here: Couple/CoupleUser are the tenant
 * records themselves, addressed by the session's own coupleId.
 */
const MEMBER_FIELDS = {
  id: true, role: true, kind: true, name: true,
  email: true, title: true, birthday: true,
} as const;

const rosterQuery = (coupleId: string) => ({
  where: { id: coupleId },
  include: {
    users: {
      select: MEMBER_FIELDS,
      orderBy: [{ kind: "asc" as const }, { createdAt: "asc" as const }],
    },
  },
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const couple = await systemPrisma.couple.findUnique(rosterQuery(session.coupleId));
  if (!couple) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(couple);
}

const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ROLES = ["Wife", "Husband"] as const;
const cleanBirthday = (v: unknown) =>
  typeof v === "string" && MMDD.test(v) ? v : null;

/** PATCH /api/couple — names, dates, children, and which partner you are. */
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const coupleId = session.coupleId;
  const data: Record<string, unknown> = {};

  if (typeof body.displayName === "string" && body.displayName.trim()) {
    data.displayName = body.displayName.trim().slice(0, 80);
  }
  if (typeof body.startDate === "string" && !Number.isNaN(Date.parse(body.startDate))) {
    data.startDate = new Date(body.startDate);
  }
  if (typeof body.timezone === "string" && body.timezone.trim()) {
    data.timezone = body.timezone.trim();
  }

  if (Object.keys(data).length > 0) {
    await systemPrisma.couple.update({ where: { id: coupleId }, data });
  }

  // ── Which partner am I? ──
  // A family invite hands out whichever seat is free, so the person who
  // accepted it may well be sitting in the wrong one. They can move as long
  // as the seat they want is empty; the role lives in the JWT, so the session
  // has to be re-signed rather than merely updated in the database.
  let newRole: string | null = null;
  if (ROLES.includes(body.claimRole) && body.claimRole !== session.userId) {
    const taken = await systemPrisma.coupleUser.findFirst({
      where: { coupleId, role: body.claimRole },
    });
    if (taken) {
      return NextResponse.json(
        { error: `${body.claimRole} is already taken in this family.` },
        { status: 409 },
      );
    }
    await systemPrisma.coupleUser.updateMany({
      where: { coupleId, role: session.userId },
      data: { role: body.claimRole },
    });
    newRole = body.claimRole;
  }

  // ── Partners: name, birthday, and the label they go by ──
  if (Array.isArray(body.members)) {
    for (const m of body.members) {
      // A role the caller may have just moved out of should still resolve.
      const role = m?.role === session.userId && newRole ? newRole : m?.role;
      if (!ROLES.includes(role)) continue;

      const patch: Record<string, unknown> = {};
      if (typeof m.name === "string" && m.name.trim()) patch.name = m.name.trim().slice(0, 40);
      if ("birthday" in m) patch.birthday = cleanBirthday(m.birthday);
      if (typeof m.title === "string") patch.title = m.title.trim().slice(0, 20) || null;
      if (Object.keys(patch).length === 0) continue;

      // Scoped by coupleId, never by id alone.
      await systemPrisma.coupleUser.updateMany({
        where: { coupleId, role, kind: "adult" },
        data: patch,
      });
    }
  }

  // ── Children: the whole list is sent, so it is the whole truth ──
  if (Array.isArray(body.children)) {
    const existing = await systemPrisma.coupleUser.findMany({
      where: { coupleId, kind: "child" },
      select: { id: true },
    });
    const sent = (body.children as unknown[]).filter(
      (c: unknown): c is { id?: string; name: string; birthday?: string } =>
        !!c && typeof (c as { name?: unknown }).name === "string" && !!(c as { name: string }).name.trim(),
    );
    const keep = new Set(sent.map((c) => c.id).filter(Boolean));

    for (const gone of existing.filter((e) => !keep.has(e.id))) {
      // An event tagged to a child who is being removed would otherwise point
      // at nothing, so it goes back to untagged rather than dangling.
      await systemPrisma.calendarEvent.updateMany({
        where: { coupleId, personTag: gone.id },
        data: { personTag: null },
      });
      await systemPrisma.coupleUser.deleteMany({ where: { id: gone.id, coupleId } });
    }

    for (const c of sent) {
      const fields = {
        name: c.name.trim().slice(0, 40),
        birthday: cleanBirthday(c.birthday),
      };
      if (c.id && keep.has(c.id)) {
        await systemPrisma.coupleUser.updateMany({
          where: { id: c.id, coupleId, kind: "child" },
          data: fields,
        });
      } else {
        await systemPrisma.coupleUser.create({
          data: { coupleId, kind: "child", role: null, email: null, ...fields },
        });
      }
    }
  }

  // Re-issuing last means a failure above leaves the session untouched.
  if (newRole === "Wife" || newRole === "Husband") {
    await createSession({ userId: newRole, email: session.email, coupleId });
  }

  const updated = await systemPrisma.couple.findUnique(rosterQuery(coupleId));
  return NextResponse.json({ ...updated, roleChangedTo: newRole });
}
