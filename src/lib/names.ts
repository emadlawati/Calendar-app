import type { User } from "./types";

const NAMES: Record<User, string> = {
  Wife: process.env.WIFE_NAME || "Wife",
  Husband: process.env.HUSBAND_NAME || "Husband",
};

export function getDisplayName(userId: User): string {
  return NAMES[userId] || userId;
}
