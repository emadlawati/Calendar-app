import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TZ = "Asia/Muscat";

export async function GET() {
  try {
    const now = new Date();
    const gulfDateStr = now.toLocaleDateString("en-CA", { timeZone: TZ }); // "YYYY-MM-DD"
    const [, month, day] = gulfDateStr.split("-").map(Number);

    const memories = await prisma.memory.findMany({
      include: { event: true },
      orderBy: { createdAt: "desc" },
    });

    // Find memories whose event date falls on today's month+day in a past year
    const currentYear = new Date(gulfDateStr).getFullYear();
    const matches = memories.filter((m) => {
      const d = new Date(m.event.date);
      const mMonth = d.getUTCMonth() + 1;
      const mDay = d.getUTCDate();
      const mYear = d.getUTCFullYear();
      return mMonth === month && mDay === day && mYear < currentYear;
    });

    if (matches.length === 0) return NextResponse.json(null);

    // Return the most recent match
    const pick = matches[0];
    const yearsAgo = currentYear - new Date(pick.event.date).getUTCFullYear();

    return NextResponse.json({
      memory: {
        id: pick.id,
        journal: pick.journal,
        photos: pick.photos,
        event: {
          id: pick.event.id,
          title: pick.event.title,
          category: pick.event.category,
          date: pick.event.date.toISOString(),
        },
      },
      yearsAgo,
    });
  } catch {
    return NextResponse.json(null);
  }
}
