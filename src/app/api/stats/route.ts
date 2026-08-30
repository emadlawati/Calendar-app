import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getStreakData } from "@/lib/streaks";
import { computeMilestones } from "@/lib/milestones";
import { getCoupleContext } from "@/lib/couple-context";
import { getCategoryById } from "@/lib/categories";

export async function GET() {
  try {
    const [events, memories, bucketItems, streakData, totalHighlights, totalComments, totalNotes] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: { status: "accepted", archived: false },
        orderBy: { date: "asc" },
        select: { id: true, date: true, category: true, title: true, createdAt: true },
      }),
      prisma.memory.findMany({
        select: { photos: true, createdAt: true, event: { select: { category: true } } },
      }),
      prisma.bucketItem.findMany({ select: { completed: true, createdAt: true } }),
      getStreakData(),
      prisma.dailyHighlight.findMany({ select: { createdAt: true } }),
      prisma.comment.count(),
      prisma.note.findMany({ select: { createdAt: true } }),
    ]);

    // These two arrive as rows now, because the milestones need their dates.
    const totalHighlightsCount = totalHighlights.length;
    const totalNotesCount = totalNotes.length;

    // Counts
    const totalEvents = events.length;
    const totalMemories = memories.length;
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

    // The busiest month, for the record rather than as a target.
    const busiest = [...eventsByMonth].sort((a, b) => b.count - a.count)[0] ?? null;

    const couple = await getCoupleContext();
    const milestones = computeMilestones({
      // Ordered by when each was written down, not when it happens. Sorting
      // by event date counted entries scheduled months ahead, which produced
      // a "50th entry" dated in December — a milestone that had not happened.
      events: [...events]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((e) => ({ date: e.createdAt, title: e.title })),
      memories,
      notes: totalNotes,
      highlights: totalHighlights,
      bucketDone: bucketItems.filter((b) => b.completed),
      startDate: couple?.startDate ?? new Date(),
    });

    // No score and no level. The page said "no points, no levels" while this
    // endpoint was quietly computing both.
    return NextResponse.json({
      totalEvents,
      totalMemories,
      totalPhotos,
      totalNotes: totalNotesCount,
      totalHighlights: totalHighlightsCount,
      totalComments,
      completedBucketItems,
      totalBucketItems,
      favoriteCategory,
      categoryBreakdown,
      eventsByMonth,
      busiestMonth: busiest && busiest.count > 0 ? busiest : null,
      firstEventDate,
      streakData,
      milestones,
    });
  } catch (err) {
    console.error("Stats fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
