import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invite = searchParams.get("invite");

    // The OAuth `state` carries the invitation through Google and back, so
    // the callback knows this sign-in is a redemption rather than a login.
    // Tokens are base64url, so the "invite:" prefix can't collide.
    const state = invite ? `invite:${invite}` : "login";

    return NextResponse.json({ success: true, url: getAuthUrl(state) });
  } catch (error) {
    console.error("Login OAuth Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate login" },
      { status: 500 }
    );
  }
}
