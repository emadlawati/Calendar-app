import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUpcomingSpecialDates, seedSpecialDates } from "@/lib/special-dates";
import { getCoupleContext } from "@/lib/couple-context";

export async function GET() {
  try {
    const couple = await getCoupleContext();
    if (!couple) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Seeded from this couple's own record — birthdays, anniversary and
    // milestones all follow their dates, not the first couple's.
    await seedSpecialDates(couple);
    const upcoming = await getUpcomingSpecialDates();
    return NextResponse.json(upcoming);
  } catch (error) {
    console.error("Special dates fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch special dates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const specialDate = await prisma.specialDate.create({
      data: {
        title: body.title,
        date: new Date(body.date),
        type: body.type || "annual",
        emoji: body.emoji || null,
        createdBy: body.createdBy || "Wife",
      },
    });
    return NextResponse.json(specialDate, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create special date" }, { status: 500 });
  }
}
