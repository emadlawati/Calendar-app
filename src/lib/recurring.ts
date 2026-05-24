import prisma from "@/lib/prisma";
import { addWeeks, addMonths, addYears } from "date-fns";

export type Frequency = "weekly" | "biweekly" | "monthly" | "yearly";

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
  const from = await findNextGenerationStart(seriesId, startDate);
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

  let current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (current <= horizon) {
    if (current >= today || current >= from) {
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

    if (frequency === "weekly") {
      current = addWeeks(current, 1);
    } else if (frequency === "biweekly") {
      current = addWeeks(current, 2);
    } else if (frequency === "monthly") {
      current = addMonths(current, 1);
    } else if (frequency === "yearly") {
      current = addYears(current, 1);
    } else {
      break;
    }
  }

  if (instances.length > 0) {
    await prisma.calendarEvent.createMany({ data: instances });
  }

  await prisma.recurringSeries.update({
    where: { id: seriesId },
    data: { generatedUntil: new Date(Math.max(...instances.map(i => i.date.getTime()))) },
  });

  return instances.length;
}

async function findNextGenerationStart(seriesId: string, startDate: Date): Promise<Date> {
  const latest = await prisma.calendarEvent.findFirst({
    where: { seriesId, isRecurringInstance: true },
    orderBy: { date: "desc" },
  });
  if (latest && new Date(latest.date) >= startDate) {
    const next = addWeeks(new Date(latest.date), 1);
    return next;
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
