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

export async function getRequestUser(bodyUser?: string): Promise<User | null> {
  const session = await getSession();
  if (session) return session.userId;
  if (bodyUser === "Wife" || bodyUser === "Husband") return bodyUser;
  return null;
}
