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
/**
 * Drawn from what is actually in this calendar rather than from a generic list.
 *
 * The old set had no home for anything religious, so 52 weeks of "Review
 * Hifdh" plus Arbaeen and Eid all fell into "Other" — which is why the shelf
 * reported "Most often: Other". It also had no travel, and split Errands from
 * Appointments although a dental cleaning and a check-up are the same errand.
 */
export const EVENT_CATEGORIES: EventCategory[] = [
  { id: "betime",       label: "Just Us",           emoji: "❤️", color: "var(--cat-betime-bg)",       textColor: "var(--cat-betime-text)",       dotColor: "var(--cat-betime-dot)" },
  { id: "family",       label: "Family",            emoji: "🏡", color: "var(--cat-outings-bg)",      textColor: "var(--cat-outings-text)",      dotColor: "var(--cat-outings-dot)" },
  { id: "child",        label: "Yusr",              emoji: "🧸", color: "var(--cat-child-bg)",        textColor: "var(--cat-child-text)",        dotColor: "var(--cat-child-dot)" },
  { id: "faith",        label: "Faith",             emoji: "🕌", color: "var(--cat-faith-bg)",        textColor: "var(--cat-faith-text)",        dotColor: "var(--cat-faith-dot)" },
  { id: "travel",       label: "Travel",            emoji: "✈️", color: "var(--cat-travel-bg)",       textColor: "var(--cat-travel-text)",       dotColor: "var(--cat-travel-dot)" },
  { id: "occasions",    label: "Occasions",         emoji: "🎂", color: "var(--cat-occasions-bg)",    textColor: "var(--cat-occasions-text)",    dotColor: "var(--cat-occasions-dot)" },
  { id: "social",       label: "Social",            emoji: "🥂", color: "var(--cat-social-bg)",       textColor: "var(--cat-social-text)",       dotColor: "var(--cat-social-dot)" },
  { id: "appointments", label: "Errands & appointments", emoji: "🩺", color: "var(--cat-appointments-bg)", textColor: "var(--cat-appointments-text)", dotColor: "var(--cat-appointments-dot)" },
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
  adventure: "travel",
  trip: "travel",
  special: "occasions",
  chores: "appointments",
  casual: "social",
  // Retired in the 2026 category rework.
  outings: "family",
  errands: "appointments",
};

export function getCategoryById(id: string | null | undefined): EventCategory {
  if (!id) return EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
  const normalized = LEGACY_CATEGORY_MAP[id] ?? id;
  return (
    EVENT_CATEGORIES.find((c) => c.id === normalized) ||
    EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1]
  );
}
