import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeErrorResponse } from "@/lib/api-errors";

/**
 * Stopping a repeating chore.
 *
 * DELETE ends the series and clears the occurrence still waiting to be done.
 * Anything already ticked off stays, because it is a record of what happened —
 * removing it would rewrite history to tidy a list.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const series = await prisma.taskSeries.findUnique({ where: { id } });
    if (!series) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.task.deleteMany({ where: { seriesId: id, completed: false } });
    await prisma.taskSeries.update({ where: { id }, data: { active: false } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return writeErrorResponse(error, "Request failed");
  }
}

/** PATCH — change what the chore says or who it is for, from now on. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 160);
    if ("personTag" in body) data.personTag = typeof body.personTag === "string" && body.personTag ? body.personTag : null;
    if (typeof body.active === "boolean") data.active = body.active;

    const series = await prisma.taskSeries.update({ where: { id }, data });

    // The occurrence still waiting should reflect the change too, or the edit
    // appears not to have worked until the next one comes round.
    if (data.title || "personTag" in data) {
      await prisma.task.updateMany({
        where: { seriesId: id, completed: false },
        data: {
          ...(data.title ? { title: data.title as string } : {}),
          ...("personTag" in data ? { personTag: data.personTag as string | null } : {}),
        },
      });
    }

    return NextResponse.json({ series });
  } catch (error) {
    return writeErrorResponse(error, "Request failed");
  }
}
