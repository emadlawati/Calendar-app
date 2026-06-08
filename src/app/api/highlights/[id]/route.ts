import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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
  } catch {
    return NextResponse.json({ error: "Failed to update highlight" }, { status: 500 });
  }
}

// DELETE /api/highlights/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.dailyHighlight.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete highlight" }, { status: 500 });
  }
}
