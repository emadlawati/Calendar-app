import { getDisplayName } from "./names";

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
  { id: "family",  label: "Family",                  emoji: "👨‍👩‍👧", color: "#e8d6c2", textColor: "#6b3a1f" },
  { id: "couple",  label: "Couples",                 emoji: "💑", color: "#fce0d8", textColor: "#9b3a2a" },
  { id: "wife",    label: getDisplayName("Wife"),    emoji: "💐", color: "#f3dcc4", textColor: "#6b3a1f" },
  { id: "husband", label: getDisplayName("Husband"), emoji: "☕", color: "#f0e0d0", textColor: "#6b3a1f" },
  { id: "child",   label: CHILD_NAME,                emoji: "🧸", color: "#dde5ec", textColor: "#33506b" },
];

export function getPersonById(id: string | null | undefined): PersonTag | null {
  if (!id) return null;
  return PEOPLE.find((p) => p.id === id) ?? null;
}
