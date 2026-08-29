import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { systemPrisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * The couple's own record — everything that used to be environment
 * configuration. systemPrisma is right here: Couple/CoupleUser are the tenant
 * records themselves, addressed by the session's own coupleId.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const couple = await systemPrisma.couple.findUnique({
    where: { id: session.coupleId },
    include: { users: { select: { role: true, name: true, email: true, birthday: true } } },
  });
  if (!couple) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(couple);
}

const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// PATCH /api/couple — update names, dates and the child's name
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.displayName === "string" && body.displayName.trim()) {
    data.displayName = body.displayName.trim().slice(0, 80);
  }
  if (typeof body.childName === "string") {
    data.childName = body.childName.trim() || null;
  }
  if (typeof body.startDate === "string" && !Number.isNaN(Date.parse(body.startDate))) {
    data.startDate = new Date(body.startDate);
  }
  if (typeof body.timezone === "string" && body.timezone.trim()) {
    data.timezone = body.timezone.trim();
  }

  if (Object.keys(data).length > 0) {
    await systemPrisma.couple.update({ where: { id: session.coupleId }, data });
  }

  // Per-person name and birthday. Only roles inside this couple can be
  // touched — the where clause is scoped by coupleId, not by id alone.
  if (Array.isArray(body.members)) {
    for (const m of body.members) {
      if (m?.role !== "Wife" && m?.role !== "Husband") continue;
      const patch: Record<string, unknown> = {};
      if (typeof m.name === "string" && m.name.trim()) patch.name = m.name.trim().slice(0, 40);
      if (typeof m.birthday === "string") {
        patch.birthday = MMDD.test(m.birthday) ? m.birthday : null;
      }
      if (Object.keys(patch).length === 0) continue;
      await systemPrisma.coupleUser.updateMany({
        where: { coupleId: session.coupleId, role: m.role },
        data: patch,
      });
    }
  }

  const updated = await systemPrisma.couple.findUnique({
    where: { id: session.coupleId },
    include: { users: { select: { role: true, name: true, email: true, birthday: true } } },
  });
  return NextResponse.json(updated);
}
