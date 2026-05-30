/**
 * Convert a Reminder's date (UTC midnight) + time string ("HH:MM" in Muscat)
 * into a proper Date object representing the exact local moment in Muscat (+04:00).
 */
export function reminderDateTime(date: Date, time: string): Date {
  // Get the calendar date in Muscat timezone (e.g., "2024-12-25")
  const dateStr = date.toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });
  // Construct a full ISO string with Muscat offset
  return new Date(`${dateStr}T${time}:00+04:00`);
}
