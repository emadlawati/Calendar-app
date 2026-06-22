import type { User } from "./types";

const NAMES: Record<User, string> = {
  Wife: process.env.NEXT_PUBLIC_WIFE_NAME || process.env.WIFE_NAME || "Wife",
  Husband: process.env.NEXT_PUBLIC_HUSBAND_NAME || process.env.HUSBAND_NAME || "Husband",
};

export function getDisplayName(userId: User): string {
  return NAMES[userId] || userId;
}
