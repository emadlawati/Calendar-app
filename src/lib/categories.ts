export interface EventCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  dotColor: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { id: "betime",       label: "BE Time",           emoji: "❤️", color: "#fce0d8", textColor: "#9b3a2a", dotColor: "#c14a33" },
  { id: "outings",      label: "Family Outings",    emoji: "🚗", color: "#fae3b8", textColor: "#8a5a14", dotColor: "#c98a2a" },
  { id: "occasions",    label: "Special Occasions", emoji: "🎂", color: "#f9d77a", textColor: "#7a4f10", dotColor: "#d99a1c" },
  { id: "social",       label: "Social",            emoji: "🥂", color: "#e6dccb", textColor: "#5e4a30", dotColor: "#a08868" },
  { id: "errands",      label: "Errands",           emoji: "🧾", color: "#e4ddd0", textColor: "#6b5840", dotColor: "#8a7858" },
  { id: "appointments", label: "Appointments",      emoji: "🩺", color: "#dde5ec", textColor: "#33506b", dotColor: "#4d7599" },
  { id: "other",        label: "Other",             emoji: "🐾", color: "#dfd6c6", textColor: "#5a4a35", dotColor: "#8a7858" },
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
