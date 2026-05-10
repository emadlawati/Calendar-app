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
  googleEventId?: string | null;
  creatorGoogleEventId?: string | null;
  createdAt: string;
  updatedAt: string;
  // Frontend-only computed fields for react-big-calendar
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
