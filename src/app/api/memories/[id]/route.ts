import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const photos = Array.isArray(body.photos) ? JSON.stringify(body.photos) : body.photos;

    const memory = await prisma.memory.update({
      where: { id },
      data: {
        journal: body.journal !== undefined ? (body.journal || null) : undefined,
        photos: photos !== undefined ? photos : undefined,
      },
      include: { event: true },
    });

    return NextResponse.json(memory);
  } catch (error) {
    console.error("Memory update error:", error);
    return NextResponse.json({ error: "Failed to update memory" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.memory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Memory delete error:", error);
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
