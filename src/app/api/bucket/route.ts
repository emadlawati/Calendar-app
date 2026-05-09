import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const items = await prisma.bucketItem.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Bucket fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bucket" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { title, category, notes } = await request.json();
    if (!title) {
      return NextResponse.json({ success: false, error: "title required" }, { status: 400 });
    }

    const item = await prisma.bucketItem.create({
      data: {
        title,
        category: category || "other",
        notes: notes || null,
        createdBy: user,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Bucket create error:", error);
    return NextResponse.json({ success: false, error: "Failed to create bucket item" }, { status: 500 });
  }
}
