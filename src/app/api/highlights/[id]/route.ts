import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeErrorResponse } from "@/lib/api-errors";
import { getRequestUser } from "@/lib/auth";

// PATCH /api/highlights/[id] — update note and/or photos
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const user = await getRequestUser(body.createdBy);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const photosStr =
      Array.isArray(body.photos) && body.photos.length > 0
        ? JSON.stringify(body.photos)
        : null;

    const highlight = await prisma.dailyHighlight.update({
      where: { id },
      data: {
        note: body.note !== undefined ? body.note || null : undefined,
        photos: photosStr,
        createdBy: user,
      },
    });

    return NextResponse.json(highlight);
  } catch (error) {
    return writeErrorResponse(error, "Request failed");
  }
}

// DELETE /api/highlights/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Comments/reactions key on targetId strings with no FK — clean them up.
    await prisma.comment.deleteMany({ where: { targetType: "highlight", targetId: id } });
    await prisma.reaction.deleteMany({ where: { targetType: "highlight", targetId: id } });
    await prisma.dailyHighlight.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return writeErrorResponse(error, "Request failed");
  }
}
