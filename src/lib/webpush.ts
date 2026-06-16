import webpush from "web-push";
import prisma from "@/lib/prisma";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    "mailto:noreply@yaminami.uk",
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; icon?: string; url?: string }
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log("Push skipped — VAPID keys not configured");
    return;
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    data: { url: payload.url || "/" },
  });

  for (const sub of subs) {
    try {
      const keys = JSON.parse(sub.keys);
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
        message
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired — clean up
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }
}

export async function sendPushToBoth(payload: { title: string; body: string; icon?: string; url?: string }) {
  await sendPushToUser("Wife", payload);
  await sendPushToUser("Husband", payload);
}
