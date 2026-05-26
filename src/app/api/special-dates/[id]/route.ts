import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.specialDate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Special date delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
