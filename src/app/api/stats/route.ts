import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getStreakData } from "@/lib/streaks";
import { computeScore, computeLevel } from "@/lib/level";
import { getCategoryById } from "@/lib/categories";

export async function GET() {
  try {
    const [events, memories, bucketItems, notes, streakData, totalHighlights, totalComments, totalGratitude] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: { status: "accepted", archived: false },
        orderBy: { date: "asc" },
        select: { id: true, date: true, category: true },
      }),
      prisma.memory.findMany({
        select: { photos: true, event: { select: { category: true } } },
      }),
      prisma.bucketItem.findMany({ select: { completed: true } }),
      prisma.stickyNote.findMany({ select: { id: true } }),
      getStreakData(),
      prisma.dailyHighlight.count(),
      prisma.comment.count(),
      prisma.gratitude.count(),
    ]);

    // Counts
    const totalEvents = events.length;
    const totalMemories = memories.length;
    const totalNotes = notes.length;
    const completedBucketItems = bucketItems.filter((b) => b.completed).length;
    const totalBucketItems = bucketItems.length;

    // Photo count
    let totalPhotos = 0;
    for (const m of memories) {
      if (m.photos) {
        try {
          const arr = JSON.parse(m.photos) as string[];
          totalPhotos += arr.length;
        } catch { /* ignore */ }
      }
    }

    // Category breakdown
    const catCounts: Record<string, number> = {};
    for (const e of events) {
      const key = e.category || "other";
      catCounts[key] = (catCounts[key] ?? 0) + 1;
    }
    const categoryBreakdown = Object.entries(catCounts)
      .map(([id, count]) => {
        const cat = getCategoryById(id);
        return { id: cat.id, label: cat.label, emoji: cat.emoji, count, color: cat.color };
      })
      .sort((a, b) => b.count - a.count);

    const favoriteCategory = categoryBreakdown[0] ?? null;

    // Events by month (last 12 months)
    const now = new Date();
    const monthCounts: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthCounts[key] = 0;
    }
    for (const e of events) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthCounts) monthCounts[key]++;
    }
    const eventsByMonth = Object.entries(monthCounts).map(([month, count]) => ({ month, count }));

    // First event date
    const firstEventDate = events[0]?.date?.toISOString().split("T")[0] ?? null;

    // Level
    const score = computeScore(totalEvents, totalMemories, completedBucketItems, totalNotes, totalHighlights, totalComments, totalGratitude);
    const levelResult = computeLevel(score);

    return NextResponse.json({
      totalEvents,
      totalMemories,
      totalPhotos,
      totalNotes,
      completedBucketItems,
      totalBucketItems,
      favoriteCategory,
      categoryBreakdown,
      eventsByMonth,
      firstEventDate,
      streakData,
      ...levelResult,
    });
  } catch (err) {
    console.error("Stats fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
