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
  const secret = process.env.GOOGLE_CLIENT_SECRET || "fallback-secret-change-me";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: User;
  email: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, email: payload.email })
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
    return payload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_NAME);
}
