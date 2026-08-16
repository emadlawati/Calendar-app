export interface EventCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  dotColor: string;
}

// Colors are CSS variable references so every consumer (inline styles included)
// picks up the dark-mode palette defined in globals.css for free.
export const EVENT_CATEGORIES: EventCategory[] = [
  { id: "betime",       label: "BE Time",           emoji: "❤️", color: "var(--cat-betime-bg)",       textColor: "var(--cat-betime-text)",       dotColor: "var(--cat-betime-dot)" },
  { id: "outings",      label: "Family Outings",    emoji: "🚗", color: "var(--cat-outings-bg)",      textColor: "var(--cat-outings-text)",      dotColor: "var(--cat-outings-dot)" },
  { id: "occasions",    label: "Special Occasions", emoji: "🎂", color: "var(--cat-occasions-bg)",    textColor: "var(--cat-occasions-text)",    dotColor: "var(--cat-occasions-dot)" },
  { id: "social",       label: "Social",            emoji: "🥂", color: "var(--cat-social-bg)",       textColor: "var(--cat-social-text)",       dotColor: "var(--cat-social-dot)" },
  { id: "errands",      label: "Errands",           emoji: "🧾", color: "var(--cat-errands-bg)",      textColor: "var(--cat-errands-text)",      dotColor: "var(--cat-errands-dot)" },
  { id: "appointments", label: "Appointments",      emoji: "🩺", color: "var(--cat-appointments-bg)", textColor: "var(--cat-appointments-text)", dotColor: "var(--cat-appointments-dot)" },
  { id: "other",        label: "Other",             emoji: "🐾", color: "var(--cat-other-bg)",        textColor: "var(--cat-other-text)",        dotColor: "var(--cat-other-dot)" },
];

/**
 * Categories retired in the 2026 rework. Old rows (and Google-synced copies)
 * still carry these ids, so map them to the closest current category instead
 * of dumping everything into "Other".
 */
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  romantic: "betime",
  datenight: "betime",
  "date-night": "betime",
  adventure: "outings",
  trip: "outings",
  special: "occasions",
  chores: "errands",
  casual: "social",
};

export function getCategoryById(id: string | null | undefined): EventCategory {
  if (!id) return EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
  const normalized = LEGACY_CATEGORY_MAP[id] ?? id;
  return (
    EVENT_CATEGORIES.find((c) => c.id === normalized) ||
    EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1]
  );
}
