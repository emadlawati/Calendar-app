export interface EventCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { id: "date-night", label: "Date Night", emoji: "🍽️", color: "#fce4ec" },
  { id: "adventure", label: "Adventure", emoji: "🏃", color: "#e8f5e9" },
  { id: "special", label: "Special Occasion", emoji: "🎂", color: "#fff3e0" },
  { id: "chores", label: "Chores", emoji: "🧹", color: "#e3f2fd" },
  { id: "casual", label: "Casual Hangout", emoji: "🎮", color: "#f3e5f5" },
  { id: "other", label: "Other", emoji: "🐾", color: "#fdfbf7" },
];

export function getCategoryById(id: string | null | undefined): EventCategory {
  return EVENT_CATEGORIES.find((c) => c.id === id) || EVENT_CATEGORIES[5];
}
