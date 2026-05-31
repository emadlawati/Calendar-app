import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { deleteCalendarEvent } from "@/lib/google-calendar";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch reminder to get Google Calendar IDs before deleting
    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    // Delete from Google Calendar for both partners
    const deletions: Promise<boolean>[] = [];
    if (reminder.googleEventIdWife) {
      deletions.push(
        deleteCalendarEvent(reminder.googleEventIdWife, "Wife")
          .catch((e) => { console.error("Wife GCal reminder delete failed:", e); return false; })
      );
    }
    if (reminder.googleEventIdHusband) {
      deletions.push(
        deleteCalendarEvent(reminder.googleEventIdHusband, "Husband")
          .catch((e) => { console.error("Husband GCal reminder delete failed:", e); return false; })
      );
    }
    await Promise.allSettled(deletions);

    // Delete from database
    await prisma.reminder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reminder delete error:", error);
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
  }
}
