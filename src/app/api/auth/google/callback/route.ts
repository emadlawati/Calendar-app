import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { google } from "googleapis";
import prisma from "@/lib/prisma";
import { getOAuth2Client } from "@/lib/google-calendar";
import { createSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      console.error("Missing code or state:", { code: !!code, state: !!state });
      return NextResponse.redirect(
        new URL("/?google=error&reason=missing_params", request.url)
      );
    }

    // Exchange code for tokens (only once!)
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user's email from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    const email = userInfo.email;

    if (!email) {
      return NextResponse.redirect(
        new URL("/login?error=no_email", request.url)
      );
    }

    const isLogin = state === "login";
    let userId: string;

    if (isLogin) {
      const loginEmail = (email || "").trim().toLowerCase();

      console.log("Login attempt — email:", loginEmail);

      // First: check if this email already exists in Google Calendar tokens
      const existingToken = await prisma.googleCalendarToken.findFirst({
        where: { email: { equals: loginEmail, mode: "insensitive" } },
      });

      if (existingToken) {
        userId = existingToken.userId;
        console.log("Login matched via existing Google Calendar token — userId:", userId);
      } else {
        // Fallback: compare against env vars
        const wifeEmail = (process.env.WIFE_EMAIL || "").trim().toLowerCase();
        const husbandEmail = (process.env.HUSBAND_EMAIL || "").trim().toLowerCase();

        console.log("Expected Wife:", wifeEmail, "| Husband:", husbandEmail);

        if (loginEmail === wifeEmail) {
          userId = "Wife";
        } else if (loginEmail === husbandEmail) {
          userId = "Husband";
        } else {
          console.error("MISMATCH — got:", loginEmail, "wanted:", wifeEmail, "or", husbandEmail);
          console.error("Lengths — got:", loginEmail.length, "wife:", wifeEmail.length, "husband:", husbandEmail.length);
          const errorUrl = new URL("/login", request.url);
          errorUrl.searchParams.set("error", "unauthorized");
          errorUrl.searchParams.set("email", loginEmail);
          return NextResponse.redirect(errorUrl);
        }
      }
    } else {
      // Calendar connect flow: state carries the userId
      userId = state;
    }

    // Save tokens to DB
    const refreshTokenValue = tokens.refresh_token ?? null;
    await prisma.googleCalendarToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: refreshTokenValue,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        email,
      },
      create: {
        userId,
        accessToken: tokens.access_token!,
        refreshToken: refreshTokenValue,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        email,
      },
    });

    // Create session for login flow
    if (isLogin) {
      await createSession({ userId: userId as "Wife" | "Husband", email });
    }

    // Redirect
    if (isLogin) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.redirect(
      new URL(`/?google=connected&user=${userId}`, request.url)
    );
  } catch (error) {
    console.error("Google OAuth Callback Error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.redirect(
      new URL("/?google=error&reason=callback_failed", request.url)
    );
  }
}
