import { systemPrisma } from "./prisma";
import { getSession } from "./session";
import type { User } from "./types";

/**
 * Everything about the couple that used to live in environment variables:
 * who they are, what they're called, where to email them.
 *
 * Server-side counterpart to the `useCouple()` hook the client gets from
 * SessionProvider. systemPrisma is correct here — this reads the tenant
 * record itself, by its own id, which is not tenant-scoped data.
 */
export interface CoupleContext {
  id: string;
  displayName: string;
  startDate: Date;
  childName: string | null;
  timezone: string;
  /** Display name for a role, falling back to the role itself. */
  name(role: string): string;
  /** Email for a role, or null if that side hasn't joined yet. */
  email(role: string): string | null;
  /** Emails for several roles, dropping any that are missing. */
  emails(roles: string[]): string[];
  members: { role: string; name: string; email: string; birthday: string | null }[];
}

function build(couple: {
  id: string; displayName: string; startDate: Date; childName: string | null; timezone: string;
  users: { role: string; name: string; email: string; birthday: string | null }[];
}): CoupleContext {
  const byRole = new Map(couple.users.map((u) => [u.role, u]));
  return {
    id: couple.id,
    displayName: couple.displayName,
    startDate: couple.startDate,
    childName: couple.childName,
    timezone: couple.timezone,
    members: couple.users,
    name: (role) => byRole.get(role)?.name ?? role,
    email: (role) => byRole.get(role)?.email ?? null,
    emails: (roles) => roles.map((r) => byRole.get(r)?.email).filter(Boolean) as string[],
  };
}

/** Load a couple by id. */
export async function getCoupleContextById(coupleId: string): Promise<CoupleContext | null> {
  const couple = await systemPrisma.couple.findUnique({
    where: { id: coupleId },
    include: { users: true },
  });
  return couple ? build(couple) : null;
}

/** Load the couple for the current session. */
export async function getCoupleContext(): Promise<CoupleContext | null> {
  const session = await getSession();
  if (!session) return null;
  return getCoupleContextById(session.coupleId);
}

/** The other person in the couple. */
export function partnerOf(role: User): User {
  return role === "Wife" ? "Husband" : "Wife";
}
