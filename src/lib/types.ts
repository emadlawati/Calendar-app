// Shared types for the Calendar App

export type User = "Wife" | "Husband";

export type EventStatus = "pending" | "accepted" | "adjusted";

export interface CalendarEvent {
  id: string;
  title: string;
  notes: string | null;
  date: string; // ISO date string from the database
  time: string;  // HH:mm format
  endTime: string | null; // optional end time (HH:mm format)
  createdBy: User;
  status: EventStatus;
  archived: boolean;
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
  createdBy: User;
}

export interface ActionPayload {
  action: "accept" | "adjust" | "delete" | "archive" | "unarchive";
  eventId: string;
  date?: string;
  time?: string;
  user?: User;
}
