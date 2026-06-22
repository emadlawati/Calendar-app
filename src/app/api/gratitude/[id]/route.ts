import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";

// DELETE /api/gratitude/[id] — author can remove their own entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let bodyUser: string | undefined;
    try {
      const body = await request.json();
      bodyUser = body?.createdBy;
    } catch { /* no body — rely on session */ }

    const user = await getRequestUser(bodyUser);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const entry = await prisma.gratitude.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (entry.createdBy !== user) {
      return NextResponse.json({ error: "You can only delete your own entries" }, { status: 403 });
    }

    await prisma.gratitude.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
