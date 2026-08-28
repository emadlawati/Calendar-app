import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeErrorResponse } from "@/lib/api-errors";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.specialDate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return writeErrorResponse(error, "Request failed");
  }
}
