export interface EventCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  dotColor: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { id: "romantic", label: "Romantic", emoji: "❤️", color: "#fce0d8", textColor: "#9b3a2a", dotColor: "#c14a33" },
  { id: "datenight", label: "Date Night", emoji: "🍽️", color: "#e8d6c2", textColor: "#6b3a1f", dotColor: "#8a4a22" },
  { id: "adventure", label: "Adventure", emoji: "🏃", color: "#fae3b8", textColor: "#8a5a14", dotColor: "#c98a2a" },
  { id: "special", label: "Special Occasion", emoji: "🎂", color: "#f9d77a", textColor: "#7a4f10", dotColor: "#d99a1c" },
  { id: "chores", label: "Chores", emoji: "🧹", color: "#e4ddd0", textColor: "#6b5840", dotColor: "#8a7858" },
  { id: "casual", label: "Casual Hangout", emoji: "🎮", color: "#e6dccb", textColor: "#5e4a30", dotColor: "#a08868" },
  { id: "other", label: "Other", emoji: "🐾", color: "#dfd6c6", textColor: "#5a4a35", dotColor: "#8a7858" },
];

export function getCategoryById(id: string | null | undefined): EventCategory {
  const normalized = id === "date-night" ? "datenight" : id;
  return EVENT_CATEGORIES.find((c) => c.id === normalized) || EVENT_CATEGORIES[6];
}
