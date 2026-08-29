import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeErrorResponse } from "@/lib/api-errors";
import { nextAfter } from "@/lib/tasks";

function parseDueDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const t = Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(t) ? null : new Date(t);
}

/** PATCH — tick it off, put it back, or edit it. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 160);
    if ("notes" in body) data.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null;
    if ("personTag" in body) data.personTag = typeof body.personTag === "string" && body.personTag ? body.personTag : null;
    if ("dueDate" in body) {
      data.dueDate = parseDueDate(body.dueDate);
      // A moved date deserves its own nudge on the new day.
      data.notifiedDue = false;
    }
    if (typeof body.completed === "boolean") {
      data.completed = body.completed;
      data.completedAt = body.completed ? new Date() : null;
      data.completedBy = body.completed ? user : null;
    }

    // Scoped by the client extension and by the policy underneath it, so an
    // id from another family simply is not found.
    const task = await prisma.task.update({ where: { id }, data });

    // Finishing a repeating chore is what schedules the next one — there is
    // never more than one open occurrence, so the list stays short.
    let next = null;
    if (body.completed === true && task.seriesId) {
      const series = await prisma.taskSeries.findUnique({ where: { id: task.seriesId } });
      if (series?.active) {
        const alreadyOpen = await prisma.task.count({
          where: { seriesId: series.id, completed: false },
        });
        if (alreadyOpen === 0) {
          next = await prisma.task.create({
            data: {
              title: series.title,
              notes: series.notes,
              personTag: series.personTag,
              createdBy: series.createdBy,
              seriesId: series.id,
              dueDate: nextAfter(series, task.dueDate ?? new Date(), new Date()),
            },
          });
        }
      }
    }

    return NextResponse.json({ task, next });
  } catch (error) {
    return writeErrorResponse(error, "Request failed");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Deleting one occurrence of a chore should not silently end the chore —
    // that is what stopping the series is for, so the series is left alone.
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return writeErrorResponse(error, "Request failed");
  }
}
