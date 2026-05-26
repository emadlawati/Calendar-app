// Shared types for the Calendar App

export type User = "Wife" | "Husband";

export type EventStatus = "pending" | "accepted" | "adjusted";

export interface CalendarEvent {
  id: string;
  title: string;
  notes: string | null;
  date: string;
  time: string;
  endTime: string | null;
  category: string | null;
  allDay: boolean;
  createdBy: User;
  status: EventStatus;
  archived: boolean;
  memoryId?: string | null;
  googleEventId?: string | null;
  creatorGoogleEventId?: string | null;
  seriesId?: string | null;
  isRecurring?: boolean;
  isRecurringInstance?: boolean;
  createdAt: string;
  updatedAt: string;
  start?: Date;
  end?: Date;
}

export interface CreateEventPayload {
  title: string;
  date: string;
  time: string;
  endTime?: string;
  notes: string;
  category?: string;
  allDay?: boolean;
  createdBy: User;
}

export interface ActionPayload {
  action: "accept" | "adjust" | "delete" | "archive" | "unarchive";
  eventId: string;
  date?: string;
  time?: string;
  title?: string;
  notes?: string | null;
  endTime?: string | null;
  category?: string | null;
  allDay?: boolean;
  user?: User;
}

export interface StickyNote {
  id: string;
  content: string;
  createdBy: User;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface BucketItem {
  id: string;
  title: string;
  category: string;
  notes: string | null;
  completed: boolean;
  createdBy: User;
  createdAt: string;
}

export interface SpecialDateData {
  id: string;
  title: string;
  date: string;
  type: "annual" | "one-time";
  emoji: string | null;
  createdBy: User;
  createdAt: string;
}

export interface SpecialDateWithCountdown extends SpecialDateData {
  daysLeft: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  achievements: { badgeId: string; unlockedAt: string }[];
}

export interface MemoryData {
  id: string;
  eventId: string;
  event?: CalendarEvent;
  journal: string | null;
  photos: string | null;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryStats {
  totalMemories: number;
  categoryCounts: { category: string; count: number; emoji: string }[];
  thisYearCount: number;
}

export interface PendingMemory {
  event: { id: string; title: string; category: string | null };
  daysAgo: number;
}
