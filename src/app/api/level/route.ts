import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { computeScore, computeLevel } from "@/lib/level";

/** Lightweight level endpoint used by UserMenu — COUNT queries only */
export async function GET() {
  try {
    const [totalEvents, totalMemories, completedBucketItems, totalHighlights, totalComments] = await Promise.all([
      prisma.calendarEvent.count({ where: { status: "accepted", archived: false } }),
      prisma.memory.count(),
      prisma.bucketItem.count({ where: { completed: true } }),
      prisma.dailyHighlight.count(),
      prisma.comment.count(),
    ]);

    const score = computeScore(totalEvents, totalMemories, completedBucketItems, totalHighlights, totalComments);
    const levelResult = computeLevel(score);

    return NextResponse.json(levelResult);
  } catch (err) {
    console.error("Level fetch error:", err);
    return NextResponse.json({ level: 1, title: "Brewing Beginners", emoji: "☕", score: 0, nextLevelScore: 30, progress: 0 });
  }
}
