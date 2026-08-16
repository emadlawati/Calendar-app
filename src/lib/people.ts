import { getDisplayName } from "./names";
import type { User } from "./types";

/** Who an event is about. Stored on CalendarEvent.personTag. */
export interface PersonTag {
  id: string;
  label: string;
  emoji: string;
  color: string;
  textColor: string;
}

const CHILD_NAME = process.env.NEXT_PUBLIC_CHILD_NAME || "Yusr";

export const PEOPLE: PersonTag[] = [
  { id: "family",  label: "Family",                  emoji: "👨‍👩‍👧", color: "var(--person-family-bg)",  textColor: "var(--person-family-text)" },
  { id: "couple",  label: "Couples",                 emoji: "💑", color: "var(--person-couple-bg)",  textColor: "var(--person-couple-text)" },
  { id: "wife",    label: getDisplayName("Wife"),    emoji: "💐", color: "var(--person-wife-bg)",    textColor: "var(--person-wife-text)" },
  { id: "husband", label: getDisplayName("Husband"), emoji: "☕", color: "var(--person-husband-bg)", textColor: "var(--person-husband-text)" },
  { id: "child",   label: CHILD_NAME,                emoji: "🧸", color: "var(--person-child-bg)",   textColor: "var(--person-child-text)" },
];

export function getPersonById(id: string | null | undefined): PersonTag | null {
  if (!id) return null;
  return PEOPLE.find((p) => p.id === id) ?? null;
}

/**
 * Who should be notified (push/email) about an event, based on who it's
 * tagged for. "wife"/"husband" are exclusive — only that partner hears about
 * it. Everything else (family, couple, child, or untagged) is shared, so
 * both partners hear about it, same as the app's original behavior.
 */
export function getEventNotificationRecipients(personTag: string | null | undefined): User[] {
  if (personTag === "wife") return ["Wife"];
  if (personTag === "husband") return ["Husband"];
  return ["Wife", "Husband"];
}
