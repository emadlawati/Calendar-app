import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";

// DELETE /api/comments/[id] — author can delete their own comment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Allow the user to be resolved from the session, or from a body fallback
    let bodyUser: string | undefined;
    try {
      const body = await request.json();
      bodyUser = body?.createdBy;
    } catch { /* no body — rely on session */ }

    const user = await getRequestUser(bodyUser);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (comment.createdBy !== user) {
      return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
