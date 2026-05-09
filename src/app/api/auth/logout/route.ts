import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { clearSession } from "@/lib/session";

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}
