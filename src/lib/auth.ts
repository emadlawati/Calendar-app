import { getSession } from "./session";
import { redirect } from "next/navigation";
import type { User } from "./types";

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  return session.userId;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Resolves the caller strictly from the session cookie. The legacy
 * body/query fallback (trusting a client-supplied "Wife"/"Husband") let
 * unauthenticated requests act as either partner — middleware blocks those
 * paths today, but this keeps the API safe even if route protection drifts.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getRequestUser(_bodyUser?: string): Promise<User | null> {
  return getCurrentUser();
}
