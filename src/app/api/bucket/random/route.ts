import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const uncompleted = await prisma.bucketItem.findMany({
      where: { completed: false },
    });

    if (uncompleted.length === 0) {
      return NextResponse.json({ success: false, error: "No uncompleted items" }, { status: 404 });
    }

    const random = uncompleted[Math.floor(Math.random() * uncompleted.length)];
    return NextResponse.json({ success: true, item: random });
  } catch (error) {
    console.error("Bucket random error:", error);
    return NextResponse.json({ success: false, error: "Failed to get random item" }, { status: 500 });
  }
}
