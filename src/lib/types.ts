// Shared types for the Calendar App

export type User = "Wife" | "Husband";

export type EventStatus = "pending" | "accepted" | "adjusted";

export interface CalendarEvent {
  id: string;
  title: string;
  notes: string | null;
  date: string;
  endDate?: string | null;
  time: string;
  endTime: string | null;
  category: string | null;
  /** Who the event is about: "family" | "wife" | "husband" | "child" */
  personTag?: string | null;
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
  specialDateId?: string | null;
  createdAt: string;
  updatedAt: string;
  start?: Date;
  end?: Date;
}

export interface CreateEventPayload {
  title: string;
  date: string;
  endDate?: string;
  time: string;
  endTime?: string;
  notes: string;
  category?: string;
  personTag?: string | null;
  allDay?: boolean;
  createdBy: User;
  specialDateId?: string | null;
}

export interface ActionPayload {
  action: "accept" | "adjust" | "edit" | "delete" | "archive" | "unarchive";
  eventId: string;
  date?: string;
  endDate?: string | null;
  time?: string;
  title?: string;
  notes?: string | null;
  endTime?: string | null;
  category?: string | null;
  allDay?: boolean;
  /** undefined = keep, null = unlink, string = link to that special date */
  specialDateId?: string | null;
  /** undefined = keep, null = clear, string = tag that person */
  personTag?: string | null;
  user?: User;
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

export interface Reminder {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string | null;
  createdBy: User;
  sent24h: boolean;
  sent1h: boolean;
  createdAt: string;
}

export interface DailyHighlight {
  id: string;
  date: string;        // "YYYY-MM-DD"
  note: string | null;
  photos: string | null; // JSON array of URLs
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export type NoteKind = "note" | "gratitude";

/** A message to your partner — either a plain note or an appreciation. */
export interface Note {
  id: string;
  content: string;
  kind: NoteKind;
  createdBy: User;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export type CommentTarget = "memory" | "highlight";

export interface Comment {
  id: string;
  targetType: CommentTarget;
  targetId: string;
  content: string;
  createdBy: User;
  createdAt: string;
}

export interface Reaction {
  id: string;
  targetType: CommentTarget;
  targetId: string;
  emoji: string;
  createdBy: User;
  createdAt: string;
}

