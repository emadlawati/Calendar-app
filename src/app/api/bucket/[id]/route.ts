import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { writeErrorResponse } from "@/lib/api-errors";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.bucketItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return writeErrorResponse(error, "Request failed");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const item = await prisma.bucketItem.update({
      where: { id },
      data: { completed: body.completed },
    });
    return NextResponse.json({ success: true, item });
  } catch (error) {
    return writeErrorResponse(error, "Request failed");
  }
}
