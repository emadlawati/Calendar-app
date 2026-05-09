import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: session.userId,
    email: session.email,
  });
}
