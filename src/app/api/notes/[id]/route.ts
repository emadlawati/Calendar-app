import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// PATCH /api/notes/[id] — mark a received note as read
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Only the recipient marks a note as read
    if (note.createdBy === user) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await prisma.note.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

// DELETE /api/notes/[id] — author can remove their own note
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (note.createdBy !== user) {
      return NextResponse.json({ error: "You can only delete your own notes" }, { status: 403 });
    }

    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
