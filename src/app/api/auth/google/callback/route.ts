import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { google } from "googleapis";
import prisma, { systemPrisma, withCouple } from "@/lib/prisma";
import { getOAuth2Client } from "@/lib/google-calendar";
import { createSession, getSession } from "@/lib/session";

/**
 * Turn a valid invitation into membership, for the email Google just proved.
 *
 * Guards, in order: the invite must exist, be unused and unexpired; the email
 * must not already belong to a couple; and for a partner invite the seat must
 * still be free. The invite is marked used in the same transaction that
 * creates the membership, so a link cannot be redeemed twice.
 */
async function redeemInvite(
  token: string,
  email: string,
): Promise<{ coupleId: string; role: string } | { error: string }> {
  const invite = await systemPrisma.invite.findUnique({ where: { token } });
  if (!invite) return { error: "invite_unknown" };
  if (invite.usedAt) return { error: "invite_used" };
  if (invite.expiresAt < new Date()) return { error: "invite_expired" };
  if (invite.email && invite.email.toLowerCase() !== email) return { error: "invite_wrong_email" };

  // One person, one couple — otherwise a session's coupleId would be ambiguous.
  const already = await systemPrisma.coupleUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (already) return { error: "already_member" };

  if (invite.coupleId) {
    // Joining an existing family as the missing partner. If the invitation
    // didn't name a seat, take whichever one is free rather than assuming.
    const seats = await systemPrisma.coupleUser.findMany({
      where: { coupleId: invite.coupleId, kind: "adult" },
      select: { role: true },
    });
    const filled = new Set(seats.map((s) => s.role));
    const role = invite.role ?? (filled.has("Wife") ? "Husband" : "Wife");
    if (filled.has(role)) return { error: "seat_taken" };

    const [, ] = await systemPrisma.$transaction([
      systemPrisma.coupleUser.create({
        data: { coupleId: invite.coupleId, role, email, name: role },
      }),
      systemPrisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
    ]);
    return { coupleId: invite.coupleId, role };
  }

  // A brand-new family. Both seats are free, so this one is provisional —
  // /welcome asks which partner they actually are and moves them if needed.
  // Names and dates are collected there too; the placeholders here are never
  // shown without that step completing.
  const couple = await systemPrisma.couple.create({
    data: {
      displayName: "A new collection",
      startDate: new Date(),
      users: { create: [{ role: "Wife", kind: "adult", email, name: "Wife" }] },
    },
  });
  await systemPrisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
  return { coupleId: couple.id, role: "Wife" };
}

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
    const inviteToken = state.startsWith("invite:") ? state.slice("invite:".length) : null;
    let userId: string;
    let coupleId: string;
    let joined = false;

    if (inviteToken) {
      // Redeeming an invitation. The email is whatever Google just proved,
      // which is why the form details are collected afterwards rather than
      // trusted from the link.
      const redeemed = await redeemInvite(inviteToken, email.trim().toLowerCase());
      if ("error" in redeemed) {
        const url = new URL("/login", request.url);
        url.searchParams.set("error", redeemed.error);
        return NextResponse.redirect(url);
      }
      userId = redeemed.role;
      coupleId = redeemed.coupleId;
      joined = true;
    } else if (isLogin) {
      const loginEmail = email.trim().toLowerCase();

      // Membership is the source of truth: an email either belongs to a
      // couple or it does not. systemPrisma because we are resolving *which*
      // couple — there is no scope to work within yet.
      // kind: "adult" is belt-and-braces — children have no email at all, so
      // they cannot match, but signing in is a partner's privilege explicitly.
      const member = await systemPrisma.coupleUser.findFirst({
        where: { email: { equals: loginEmail, mode: "insensitive" }, kind: "adult" },
      });

      // The session carries the role, so a member without one cannot have a
      // session at all. Every adult is given a seat when they join, so this
      // is a corrupt row rather than a state a person can reach.
      if (!member?.role) {
        const errorUrl = new URL("/login", request.url);
        errorUrl.searchParams.set("error", "unauthorized");
        errorUrl.searchParams.set("email", loginEmail);
        return NextResponse.redirect(errorUrl);
      }

      userId = member.role;
      coupleId = member.coupleId;
    } else {
      // Calendar-connect flow: the user is already signed in, and `state`
      // carries which role is connecting. Trust the session for the couple.
      const session = await getSession();
      if (!session) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      userId = state;
      coupleId = session.coupleId;
    }

    // Store the calendar tokens inside that couple's scope.
    const refreshTokenValue = tokens.refresh_token ?? null;
    await withCouple(coupleId, async () => {
      const fields = {
        accessToken: tokens.access_token!,
        refreshToken: refreshTokenValue,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        email,
      };
      const existing = await prisma.googleCalendarToken.findFirst({ where: { userId } });
      if (existing) {
        await prisma.googleCalendarToken.update({ where: { id: existing.id }, data: fields });
      } else {
        await prisma.googleCalendarToken.create({ data: { userId, ...fields } });
      }
    });

    if (isLogin || joined) {
      await createSession({ userId: userId as "Wife" | "Husband", email, coupleId });
      // A new arrival still has to say who they are.
      return NextResponse.redirect(new URL(joined ? "/welcome" : "/", request.url));
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
