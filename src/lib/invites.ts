import { systemPrisma } from "@/lib/prisma";

/**
 * Turning an invitation into membership.
 *
 * Lives here rather than inside the OAuth callback so that the registration
 * path has exactly one implementation — the callback calls it, and so can a
 * test, instead of a test re-implementing the rules and proving nothing.
 *
 * Every guard below is a way someone could otherwise end up in the wrong
 * family, or in two.
 */
export type RedeemResult =
  | { coupleId: string; role: string }
  | { error: string };

export async function redeemInvite(
  token: string,
  email: string,
): Promise<RedeemResult> {
  const invite = await systemPrisma.invite.findUnique({ where: { token } });
  if (!invite) return { error: "invite_unknown" };
  if (invite.usedAt) return { error: "invite_used" };
  if (invite.expiresAt < new Date()) return { error: "invite_expired" };
  if (invite.email && invite.email.toLowerCase() !== email) return { error: "invite_wrong_email" };

  // One person, one couple — otherwise a session's coupleId would be ambiguous.
  const already = await systemPrisma.coupleUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (already) return { error: "already_member" };

  if (invite.coupleId) {
    // Joining an existing family as the missing partner. If the invitation
    // didn't name a seat, take whichever one is free rather than assuming.
    const seats = await systemPrisma.coupleUser.findMany({
      where: { coupleId: invite.coupleId, kind: "adult" },
      select: { role: true },
    });
    const filled = new Set(seats.map((s) => s.role));
    const role = invite.role ?? (filled.has("Wife") ? "Husband" : "Wife");
    if (filled.has(role)) return { error: "seat_taken" };

    const [, ] = await systemPrisma.$transaction([
      systemPrisma.coupleUser.create({
        data: { coupleId: invite.coupleId, role, email, name: role },
      }),
      systemPrisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
    ]);
    return { coupleId: invite.coupleId, role };
  }

  // A brand-new family. Both seats are free, so this one is provisional —
  // /welcome asks which partner they actually are and moves them if needed.
  // Names and dates are collected there too; the placeholders here are never
  // shown without that step completing.
  const couple = await systemPrisma.couple.create({
    data: {
      displayName: "A new collection",
      startDate: new Date(),
      users: { create: [{ role: "Wife", kind: "adult", email, name: "Wife" }] },
    },
  });
  await systemPrisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
  return { coupleId: couple.id, role: "Wife" };
}
