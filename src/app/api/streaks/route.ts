import { NextResponse } from "next/server";
import { getStreakData } from "@/lib/streaks";

export async function GET() {
  try {
    const data = await getStreakData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch streak data" }, { status: 500 });
  }
}
