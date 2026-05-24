import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCategoryById } from "@/lib/categories";

export async function GET() {
  try {
    const memories = await prisma.memory.findMany({
      include: { event: true },
    });

    if (memories.length === 0) {
      return NextResponse.json({
        totalMemories: 0,
        categoryCounts: [],
        thisYearCount: 0,
      });
    }

    const categoryMap = new Map<string, number>();
    for (const m of memories) {
      const cat = m.event.category || "other";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }

    const categoryCounts: { category: string; count: number; emoji: string }[] = [];
    for (const [cat, count] of categoryMap) {
      const catInfo = getCategoryById(cat);
      categoryCounts.push({ category: cat, count, emoji: catInfo.emoji });
    }
    categoryCounts.sort((a, b) => b.count - a.count);

    const thisYear = new Date().getFullYear();
    const thisYearCount = memories.filter((m) => {
      const created = new Date(m.createdAt);
      return created.getFullYear() === thisYear;
    }).length;

    return NextResponse.json({
      totalMemories: memories.length,
      categoryCounts,
      thisYearCount,
    });
  } catch (error) {
    return NextResponse.json({
      totalMemories: 0,
      categoryCounts: [],
      thisYearCount: 0,
    });
  }
}
