import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  try {
    const authUrl = getAuthUrl("login");
    return NextResponse.json({ success: true, url: authUrl });
  } catch (error) {
    console.error("Login OAuth Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate login" },
      { status: 500 }
    );
  }
}
