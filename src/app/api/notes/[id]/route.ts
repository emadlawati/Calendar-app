import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.stickyNote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Note delete error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete note" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.stickyNote.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Note patch error:", error);
    return NextResponse.json({ success: false, error: "Failed to update note" }, { status: 500 });
  }
}
