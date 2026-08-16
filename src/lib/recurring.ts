import prisma from "@/lib/prisma";
import { addWeeks, addMonths, addYears } from "date-fns";

export type Frequency = "weekly" | "biweekly" | "monthly" | "yearly";

/**
 * All event dates are stored as UTC midnight (the API creates them from
 * "YYYY-MM-DD" strings). Normalize to UTC midnight so generation behaves
 * identically on a +04:00 dev machine and a UTC server.
 */
function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addInterval(date: Date, frequency: Frequency, times = 1): Date {
  switch (frequency) {
    case "weekly":
      return addWeeks(date, times);
    case "biweekly":
      return addWeeks(date, 2 * times);
    case "monthly":
      return addMonths(date, times);
    case "yearly":
      return addYears(date, times);
  }
}

export async function generateInstances(
  seriesId: string,
  title: string,
  startDate: Date,
  time: string,
  endTime: string | null,
  notes: string | null,
  category: string | null,
  allDay: boolean,
  createdBy: string,
  frequency: Frequency,
  endDate?: Date | null,
  horizonMonths = 12
): Promise<number> {
  const from = await findNextGenerationStart(seriesId, startDate, frequency);
  const horizon = endDate
    ? new Date(Math.min(endDate.getTime(), addMonths(new Date(), horizonMonths).getTime()))
    : addMonths(new Date(), horizonMonths);

  const instances: {
    title: string;
    date: Date;
    time: string;
    endTime: string | null;
    notes: string | null;
    category: string | null;
    allDay: boolean;
    createdBy: string;
    seriesId: string;
    isRecurring: boolean;
    isRecurringInstance: boolean;
    status: string;
  }[] = [];

  let current = toUtcMidnight(from);
  const today = toUtcMidnight(new Date());
  const fromUtc = toUtcMidnight(from);

  while (current <= horizon) {
    if (current >= today || current >= fromUtc) {
      instances.push({
        title,
        date: new Date(current),
        time,
        endTime,
        notes,
        category,
        allDay,
        createdBy,
        seriesId,
        isRecurring: false,
        isRecurringInstance: true,
        status: "pending",
      });
    }

    const next = toUtcMidnight(addInterval(current, frequency));
    if (next.getTime() <= current.getTime()) break; // guard: interval must advance
    current = next;
  }

  if (instances.length > 0) {
    await prisma.calendarEvent.createMany({ data: instances });
    await prisma.recurringSeries.update({
      where: { id: seriesId },
      data: { generatedUntil: new Date(Math.max(...instances.map(i => i.date.getTime()))) },
    });
  }

  return instances.length;
}

/**
 * Regeneration must resume one full interval after the latest existing
 * instance — advancing by a hardcoded week spawned weekly clones of monthly
 * and yearly series whenever the 12-month horizon rolled over.
 */
async function findNextGenerationStart(
  seriesId: string,
  startDate: Date,
  frequency: Frequency
): Promise<Date> {
  const latest = await prisma.calendarEvent.findFirst({
    where: { seriesId, isRecurringInstance: true },
    orderBy: { date: "desc" },
  });
  if (latest && new Date(latest.date) >= startDate) {
    return addInterval(new Date(latest.date), frequency);
  }
  return startDate;
}

export async function deleteFutureInstances(seriesId: string, fromDate: Date): Promise<void> {
  await prisma.calendarEvent.deleteMany({
    where: {
      seriesId,
      isRecurringInstance: true,
      date: { gte: fromDate },
    },
  });
}

export async function detachEventInstance(eventId: string): Promise<void> {
  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: { seriesId: null, isRecurringInstance: false },
  });
}
