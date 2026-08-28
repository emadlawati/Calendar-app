import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSession } from "@/lib/session";
import { systemPrisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  // The couple travels with the session so the client can render names,
  // the child's name and the start date without any NEXT_PUBLIC_* vars.
  // systemPrisma: we are fetching the tenant record itself, by its own id.
  const couple = await systemPrisma.couple.findUnique({
    where: { id: session.coupleId },
    include: { users: { select: { role: true, name: true, birthday: true } } },
  });

  if (!couple) {
    // The couple was deleted underneath a live session.
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: session.userId,
    email: session.email,
    couple: {
      id: couple.id,
      displayName: couple.displayName,
      startDate: couple.startDate.toISOString(),
      childName: couple.childName,
      timezone: couple.timezone,
      members: Object.fromEntries(couple.users.map((u) => [u.role, u.name])),
    },
  });
}
