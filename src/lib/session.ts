import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { User } from "./types";

export const SESSION_NAME = "session";
// Long-lived — this is a private couples app, not a banking app, and getting
// logged out every 7 days with no way to detect/renew it was the whole bug.
// Middleware also slides this window forward on every active request, so as
// long as the app is opened at least this often, sign-in never expires.
export const SESSION_MAX_AGE_SECONDS = 180 * 24 * 60 * 60; // 180 days

export function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    // A known fallback would let anyone forge session cookies.
    throw new Error(
      "SESSION_SECRET (or GOOGLE_CLIENT_SECRET) must be set — refusing to sign sessions with a fallback key."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  /** Role within the couple — "Wife" | "Husband". */
  userId: User;
  email: string;
  /** Which couple's library this session may read and write. */
  coupleId: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, email: payload.email, coupleId: payload.coupleId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_NAME);
    if (!sessionCookie) return null;

    const { payload } = await jwtVerify<SessionPayload>(
      sessionCookie.value,
      getSecretKey()
    );

    // Sessions minted before tenancy carry no coupleId. Treating those as
    // valid would mean guessing which couple they belong to — reject them
    // and make the user sign in again instead.
    if (!payload.coupleId) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * The couple this request may touch, read straight from the session cookie.
 * Used by the Prisma tenant-scoping extension so no route has to remember.
 */
export async function getSessionCoupleId(): Promise<string | undefined> {
  return (await getSession())?.coupleId;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_NAME);
}
