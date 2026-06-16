import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import resend from "@/lib/resend";
import { getCurrentUser } from "@/lib/auth";
import { getDisplayName } from "@/lib/names";
import { sendPushToUser } from "@/lib/webpush";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const partner = user === "Wife" ? "Husband" : "Wife";
    const partnerEmail = partner === "Wife"
      ? process.env.WIFE_EMAIL
      : process.env.HUSBAND_EMAIL;

    if (!partnerEmail) {
      return NextResponse.json({ success: false, error: "Partner email not configured" }, { status: 500 });
    }

    const displayName = getDisplayName(user);
    const partnerDisplayName = getDisplayName(partner);

    // Push notification to partner
    sendPushToUser(partner, {
      title: `💕 ${displayName} is thinking of you!`,
      body: "Just a little reminder that you're loved 🐾",
      url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/`,
    });

    await resend.emails.send({
      from: "Calendar 🐾 <noreply@yaminami.uk>",
      to: partnerEmail,
      subject: `💕 ${displayName} is thinking of you!`,
      html: `
        <div style="font-family: sans-serif; background-color: #fdfbf7; padding: 40px; border-radius: 32px; color: #5d4037; border: 2px solid #d7ccc8; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 20px;">💕</div>
          <h1 style="color: #5d4037; font-size: 24px;">${displayName} is thinking of you!</h1>
          <p style="font-size: 16px; color: #5d4037; opacity: 0.8; margin: 16px 0;">
            Just a little reminder that you're loved 🐾
          </p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" style="background-color: #fce4ec; color: #5d4037; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 12px;">
            Open Calendar 🧶
          </a>
          <p style="margin-top: 30px; font-size: 12px; opacity: 0.4;">Sent from Purrfect Plans 🐾</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: `Nudge sent to ${partnerDisplayName}` });
  } catch (error) {
    console.error("Nudge error:", error);
    return NextResponse.json({ success: false, error: "Failed to send nudge" }, { status: 500 });
  }
}
