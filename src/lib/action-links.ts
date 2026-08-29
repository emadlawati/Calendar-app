import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed one-click links for emails.
 *
 * An accept link has to work from a mail app on a phone where nobody is
 * signed in, which means the request arrives with no session and therefore no
 * family. Resolving the event by id alone would let anyone who learned an id
 * accept someone else's plan, so the link carries a signature instead: proof
 * that this exact action on this exact event came from an email we sent.
 *
 * The event id supplies *which* family; the signature supplies the authority.
 * Nothing here grants read access — only the single action named in the link.
 */

function secret(): string {
  const s = process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!s) throw new Error("No secret available to sign action links");
  return s;
}

function digest(eventId: string, action: string): string {
  return createHmac("sha256", secret())
    .update(`${action}:${eventId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function signEventAction(eventId: string, action: string): string {
  return digest(eventId, action);
}

export function verifyEventAction(
  eventId: string,
  action: string,
  provided: string | null,
): boolean {
  if (!provided) return false;
  const expected = digest(eventId, action);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  // Length must match before timingSafeEqual, which throws otherwise.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** The full one-click URL, signature included. */
export function eventActionUrl(baseUrl: string, eventId: string, user: string, action = "accept"): string {
  const sig = signEventAction(eventId, action);
  return `${baseUrl}/api/events/action?id=${eventId}&action=${action}&user=${encodeURIComponent(user)}&sig=${sig}`;
}
