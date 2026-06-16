import { NextResponse } from "next/server";
import resend from "@/lib/resend";

export async function POST() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const recipient = process.env.WIFE_EMAIL;

    if (!recipient) {
      return NextResponse.json({ error: "No recipient configured" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_...") {
      return NextResponse.json({ skipped: "Email not configured" });
    }

    await resend.emails.send({
      from: "Calendar \uD83D\uDC3E <noreply@yaminami.uk>",
      to: recipient,
      subject: "\uD83C\uDF82 Happy Birthday! A little something for you \uD83D\uDC95",
      html: `
        <div style="font-family: sans-serif; background-color: #fef5fb; padding: 40px; border-radius: 32px; color: #5d1a3a; border: 2px solid #f8bbd0;">
          <div style="font-size: 48px; text-align: center; margin-bottom: 8px;">\uD83C\uDF82 \uD83C\uDF88 \uD83C\uDF89</div>
          <div style="font-size: 14px; text-align: center; margin-bottom: 24px; color: #e91e63; opacity: 0.7;">
            \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
          </div>

          <h1 style="color: #5d1a3a; font-size: 28px; text-align: center;">Happy Birthday! \uD83C\uDF82</h1>
          <p style="text-align: center; font-size: 16px; color: #8e6b7a; margin: 12px 0 24px;">
            I made a little slideshow just for you \uD83D\uDC95
          </p>

          <div style="background-color: #fff; padding: 32px; border-radius: 24px; margin: 20px 0; border: 1px solid #f8bbd0; text-align: center;">
            <p style="font-size: 20px; margin: 0 0 20px;">\uD83C\uDFAC 20 birthday memories</p>

            <a href="${baseUrl}/birthday"
               style="background-color: #e91e63; color: #fff; padding: 16px 36px; border-radius: 24px; text-decoration: none; font-weight: bold; font-size: 18px; display: inline-block;">
              \uD83C\uDF82 Open Your Slideshow
            </a>
          </div>

          <p style="margin-top: 30px; font-size: 12px; opacity: 0.6; text-align: center;">
            Made with love from Purrfect Plans \uD83D\uDC3E
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Birthday invite error:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
