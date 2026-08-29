import type { User } from "./types";

/**
 * Who an event is about. Stored on CalendarEvent.personTag.
 *
 * The tag list itself is fixed; only the *labels* vary by couple, so the
 * static shape lives here and names are resolved against the signed-in
 * couple. Nothing in this file reads environment variables.
 */
export interface PersonTag {
  id: string;
  label: string;
  emoji: string;
  color: string;
  textColor: string;
}

/** Names needed to label the per-person tags. */
export interface PersonNames {
  wife?: string;
  husband?: string;
  child?: string | null;
}

const TAGS = [
  { id: "family",  emoji: "👨‍👩‍👧", color: "var(--person-family-bg)",  textColor: "var(--person-family-text)",  fixed: "Family" },
  { id: "couple",  emoji: "💑", color: "var(--person-couple-bg)",  textColor: "var(--person-couple-text)",  fixed: "Couples" },
  { id: "wife",    emoji: "💐", color: "var(--person-wife-bg)",    textColor: "var(--person-wife-text)",    fixed: null },
  { id: "husband", emoji: "☕", color: "var(--person-husband-bg)", textColor: "var(--person-husband-text)", fixed: null },
  { id: "child",   emoji: "🧸", color: "var(--person-child-bg)",   textColor: "var(--person-child-text)",   fixed: null },
] as const;

function labelFor(id: string, names: PersonNames): string {
  if (id === "wife") return names.wife || "Wife";
  if (id === "husband") return names.husband || "Husband";
  if (id === "child") return names.child || "Our little one";
  return TAGS.find((t) => t.id === id)?.fixed ?? id;
}

/** The five tags, labelled for a particular couple. */
export function resolvePeople(names: PersonNames): PersonTag[] {
  // A couple with no child recorded shouldn't be offered a child tag.
  return TAGS
    .filter((t) => t.id !== "child" || !!names.child)
    .map((t) => ({
      id: t.id,
      emoji: t.emoji,
      color: t.color,
      textColor: t.textColor,
      label: labelFor(t.id, names),
    }));
}

export function getPersonById(id: string | null | undefined, names: PersonNames = {}): PersonTag | null {
  if (!id) return null;
  const tag = TAGS.find((t) => t.id === id);
  if (!tag) return null;
  return {
    id: tag.id,
    emoji: tag.emoji,
    color: tag.color,
    textColor: tag.textColor,
    label: labelFor(tag.id, names),
  };
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
