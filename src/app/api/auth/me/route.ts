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
    include: {
      users: {
        select: { id: true, role: true, kind: true, name: true, title: true, birthday: true },
        orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!couple) {
    // The couple was deleted underneath a live session.
    return NextResponse.json({ user: null });
  }

  const adults = couple.users.filter((u) => u.kind === "adult" && u.role);

  return NextResponse.json({
    user: session.userId,
    email: session.email,
    couple: {
      id: couple.id,
      displayName: couple.displayName,
      startDate: couple.startDate.toISOString(),
      timezone: couple.timezone,
      hijriOffset: couple.hijriOffset,
      canInviteFamilies: couple.canInviteFamilies,
      // Keyed by role, for the many callers that ask "what is the Wife called".
      members: Object.fromEntries(adults.map((u) => [u.role as string, u.name])),
      // Children have no role to key on, so they travel as a list.
      children: couple.users
        .filter((u) => u.kind === "child")
        .map((u) => ({ id: u.id, name: u.name, birthday: u.birthday })),
    },
  });
}
