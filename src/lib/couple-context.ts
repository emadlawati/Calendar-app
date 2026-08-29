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
/** One person in the family. Children have no role and no email. */
export interface FamilyMember {
  id: string;
  role: string | null;
  kind: string;
  name: string;
  email: string | null;
  title: string | null;
  birthday: string | null;
}

export interface CoupleContext {
  id: string;
  displayName: string;
  startDate: Date;
  timezone: string;
  canInviteFamilies: boolean;
  /** Display name for a role, falling back to the role itself. */
  name(role: string): string;
  /** Email for a role, or null if that side hasn't joined yet. */
  email(role: string): string | null;
  /** Emails for several roles, dropping any that are missing. */
  emails(roles: string[]): string[];
  /** Every address in the family — that is, both partners. Never children. */
  adultEmails: string[];
  /** Every member, partners and children alike. */
  members: FamilyMember[];
  /** The partners — the only members who can sign in or be emailed. */
  adults: FamilyMember[];
  children: FamilyMember[];
  /** Look someone up by id, for events tagged to one particular child. */
  member(id: string): FamilyMember | null;
}

function build(couple: {
  id: string; displayName: string; startDate: Date; timezone: string;
  canInviteFamilies: boolean;
  users: FamilyMember[];
}): CoupleContext {
  // Children share a null role, so only adults belong in a by-role map.
  const adults = couple.users.filter((u) => u.kind === "adult" && u.role);
  const byRole = new Map(adults.map((u) => [u.role as string, u]));
  const byId = new Map(couple.users.map((u) => [u.id, u]));
  return {
    id: couple.id,
    displayName: couple.displayName,
    startDate: couple.startDate,
    timezone: couple.timezone,
    canInviteFamilies: couple.canInviteFamilies,
    members: couple.users,
    adults,
    children: couple.users.filter((u) => u.kind === "child"),
    adultEmails: adults.map((u) => u.email).filter((e): e is string => !!e),
    member: (id) => byId.get(id) ?? null,
    name: (role) => byRole.get(role)?.name ?? role,
    email: (role) => byRole.get(role)?.email ?? null,
    emails: (roles) => roles.map((r) => byRole.get(r)?.email).filter(Boolean) as string[],
  };
}

/** Load a couple by id. */
export async function getCoupleContextById(coupleId: string): Promise<CoupleContext | null> {
  const couple = await systemPrisma.couple.findUnique({
    where: { id: coupleId },
    // Partners first, then children oldest-added first, so every screen
    // that renders the roster agrees on the order.
    include: { users: { orderBy: [{ kind: "asc" }, { createdAt: "asc" }] } },
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
