import webpush from "web-push";
import prisma, { currentCoupleId } from "@/lib/prisma";
import { getCoupleContext, getCoupleContextById } from "@/lib/couple-context";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    "mailto:noreply@yaminami.uk",
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

export interface PushResult {
  endpoint: string;
  platform: string;
  ok: boolean;
  status?: number;
  error?: string;
}

/** Which push service an endpoint belongs to — useful when one platform fails. */
export function platformOf(endpoint: string): string {
  try {
    const host = new URL(endpoint).host;
    if (/fcm|google/.test(host)) return "Android/Chrome";
    if (/apple|icloud/.test(host)) return "iOS/Safari";
    if (/mozilla/.test(host)) return "Firefox";
    if (/microsoft|windows/.test(host)) return "Windows";
    return host;
  } catch {
    return "unknown";
  }
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; icon?: string; url?: string }
): Promise<PushResult[]> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn("[push] skipped — VAPID keys not configured");
    return [];
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) {
    // Worth saying out loud: for months this was silently true for one of the
    // two partners, so every notification aimed at them went nowhere.
    console.warn(`[push] ${userId} has no registered devices — nothing sent`);
    return [];
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    url: payload.url || "/",
    // Sent twice, in both shapes: older service workers read data.url.
    data: { url: payload.url || "/" },
  });

  const results: PushResult[] = [];

  for (const sub of subs) {
    const platform = platformOf(sub.endpoint);
    try {
      const keys = JSON.parse(sub.keys);
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
        message
      );
      results.push({ endpoint: sub.endpoint, platform, ok: true });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; body?: string; message?: string };
      const status = e.statusCode;

      if (status === 410 || status === 404) {
        // The browser dropped the subscription — clean it up.
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        results.push({ endpoint: sub.endpoint, platform, ok: false, status, error: "expired — removed" });
      } else {
        // Everything except 404/410 used to be swallowed here, which is why
        // a platform could fail for months without leaving a trace.
        const detail = (e.body || e.message || "unknown").slice(0, 300);
        console.error(`[push] ${platform} failed (${status ?? "no status"}): ${detail}`);
        results.push({ endpoint: sub.endpoint, platform, ok: false, status, error: detail });
      }
    }
  }

  return results;
}

/**
 * Everyone in the family who can receive a notification — that is, both
 * partners. Children have no devices and no account.
 */
export async function sendPushToBoth(payload: { title: string; body: string; icon?: string; url?: string }) {
  // Cron has no session but does run inside withCouple(), so the scope has to
  // be read from there rather than from a cookie.
  const scoped = currentCoupleId();
  const couple = scoped ? await getCoupleContextById(scoped) : await getCoupleContext();
  const roles = couple?.adults.length
    ? couple.adults.map((a) => a.role as string)
    : ["Wife", "Husband"];
  for (const role of roles) {
    await sendPushToUser(role, payload);
  }
}
