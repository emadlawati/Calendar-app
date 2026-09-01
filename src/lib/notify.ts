import { sendPushToUser, type PushResult } from "@/lib/webpush";

/**
 * Push first; email only when push didn't land.
 *
 * Both channels used to fire for everything, which was the right call when
 * push reached exactly one phone. Now that it works, a duplicate email for
 * every note and comment is just noise.
 *
 * Email is not switched off, though, for two reasons that still hold:
 * push subscriptions expire on their own — one phone here quietly re-registered
 * three times in a summer — and a device that has never registered receives
 * nothing at all. So a person with no working device still gets the email.
 *
 * Event invitations are the exception and always email: the accept and decline
 * links live in the email body, and a push notification cannot carry them.
 */

/** Is email configured at all? This guard was copied into six routes. */
export function emailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !!key && key !== "re_..." && key !== "re_placeholder";
}

export interface DeliveryPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  /** Group key — a new notification with the same tag replaces the old one. */
  tag?: string;
  /** Stay in the shade until it is acted on, rather than fading away. */
  sticky?: boolean;
  /** Replacing a tagged notification is silent unless this says otherwise. */
  renotify?: boolean;
  silent?: boolean;
  /** The number to put on the app icon. Omit to leave the badge alone. */
  badgeCount?: number;
}

export interface Delivery {
  /** Roles whose devices took the notification. */
  reached: string[];
  /** Roles to email instead, because nothing reached them. */
  needEmail: string[];
  results: PushResult[];
}

/**
 * Push to each role and report who still needs an email.
 * Never throws — a failed notification must not fail the request that caused it.
 */
export async function pushAndReport(
  roles: string[],
  payload: DeliveryPayload,
): Promise<Delivery> {
  const reached: string[] = [];
  const needEmail: string[] = [];
  const results: PushResult[] = [];

  for (const role of roles) {
    let mine: PushResult[] = [];
    try {
      mine = await sendPushToUser(role, payload);
    } catch (err) {
      console.error(`[notify] push to ${role} threw:`, err);
    }
    results.push(...mine);
    // No devices, or every device rejected it.
    if (mine.some((r) => r.ok)) reached.push(role);
    else needEmail.push(role);
  }

  return { reached, needEmail, results };
}
