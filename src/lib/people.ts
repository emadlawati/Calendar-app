import type { User } from "./types";

/**
 * Who an event is about. Stored on CalendarEvent.personTag.
 *
 * A tag is either one of the four fixed ids below, or a **member id** — which
 * is how one particular child gets tagged. The fixed ids are unchanged from
 * before children existed, so no historic event needed rewriting.
 *
 * Nothing in this file reads environment variables.
 */
export interface PersonTag {
  id: string;
  label: string;
  emoji: string;
  color: string;
  textColor: string;
}

/** The family roster, as much of it as the caller happens to know. */
export interface PersonNames {
  wife?: string;
  husband?: string;
  /** Children, in roster order. */
  children?: { id: string; name: string }[];
}

const TAGS = [
  { id: "family",  emoji: "👨‍👩‍👧", color: "var(--person-family-bg)",  textColor: "var(--person-family-text)",  fixed: "Family" },
  { id: "couple",  emoji: "💑", color: "var(--person-couple-bg)",  textColor: "var(--person-couple-text)",  fixed: "Couples" },
  { id: "wife",    emoji: "💐", color: "var(--person-wife-bg)",    textColor: "var(--person-wife-text)",    fixed: null },
  { id: "husband", emoji: "☕", color: "var(--person-husband-bg)", textColor: "var(--person-husband-text)", fixed: null },
] as const;

const CHILD_STYLE = {
  emoji: "🧸",
  color: "var(--person-child-bg)",
  textColor: "var(--person-child-text)",
};

function labelFor(id: string, names: PersonNames): string {
  if (id === "wife") return names.wife || "Wife";
  if (id === "husband") return names.husband || "Husband";
  return TAGS.find((t) => t.id === id)?.fixed ?? id;
}

const childTag = (child: { id: string; name: string }): PersonTag => ({
  id: child.id,
  label: child.name,
  ...CHILD_STYLE,
});

/** Every tag this family can use: the fixed four, then one per child. */
export function resolvePeople(names: PersonNames): PersonTag[] {
  const fixed = TAGS.map((t) => ({
    id: t.id,
    emoji: t.emoji,
    color: t.color,
    textColor: t.textColor,
    label: labelFor(t.id, names),
  }));
  return [...fixed, ...(names.children ?? []).map(childTag)];
}

export function getPersonById(id: string | null | undefined, names: PersonNames = {}): PersonTag | null {
  if (!id) return null;

  const tag = TAGS.find((t) => t.id === id);
  if (tag) {
    return {
      id: tag.id,
      emoji: tag.emoji,
      color: tag.color,
      textColor: tag.textColor,
      label: labelFor(tag.id, names),
    };
  }

  const child = (names.children ?? []).find((c) => c.id === id);
  if (child) return childTag(child);

  // "child" is the pre-roster tag. Anything tagged that way was migrated to a
  // member id, but a stale client or an un-migrated row shouldn't render blank.
  if (id === "child") {
    const first = (names.children ?? [])[0];
    return first ? childTag(first) : { id, label: "Our little one", ...CHILD_STYLE };
  }

  return null;
}

/**
 * Who should be notified (push/email) about an event, based on who it's
 * tagged for. "wife"/"husband" are exclusive — only that partner hears about
 * it. Everything else — family, couple, a particular child, or untagged — is
 * shared, so both partners hear about it.
 *
 * Children are never recipients: they have no address and no account.
 */
export function getEventNotificationRecipients(personTag: string | null | undefined): User[] {
  if (personTag === "wife") return ["Wife"];
  if (personTag === "husband") return ["Husband"];
  return ["Wife", "Husband"];
}
