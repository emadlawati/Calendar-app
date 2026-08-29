"use client";

/**
 * Registering this browser for push, in one place.
 *
 * Every step here can fail quietly, and each one used to: permission refused,
 * a stale subscription bound to a previous VAPID key, or a server that
 * rejected the save. The caller gets a specific reason instead of a shrug.
 */

/** base64url VAPID key -> the byte array pushManager.subscribe() wants. */
export function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
};

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type EnableResult =
  | { ok: true; platform?: string }
  | { ok: false; reason: string; denied?: boolean };

export async function enablePush(): Promise<EnableResult> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  if (!pushSupported()) {
    return { ok: false, reason: "This browser can't receive push notifications." };
  }
  if (!key) {
    return { ok: false, reason: "This app has no VAPID public key configured." };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      return {
        ok: false,
        denied: perm === "denied",
        reason:
          perm === "denied"
            ? "Your browser is blocking notifications for this site. Re-enable them in Site settings → Notifications."
            : "Permission wasn't granted.",
      };
    }

    const reg = await navigator.serviceWorker.ready;
    const wanted = urlBase64ToUint8Array(key);

    // A subscription bound to an older VAPID key makes subscribe() throw
    // InvalidStateError on Chrome. Replace it rather than failing.
    const existing = await reg.pushManager.getSubscription();
    if (existing && !sameKey(existing.options?.applicationServerKey, wanted)) {
      await existing.unsubscribe();
    }

    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: wanted as BufferSource,
      }));

    const raw = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ endpoint: raw.endpoint, keys: raw.keys }),
    });
    // Registering with the browser is only half of it; if the server did not
    // store the subscription, nothing will ever be sent here.
    if (!res.ok) {
      return { ok: false, reason: `The server rejected this device (HTTP ${res.status}).` };
    }

    const body = await res.json().catch(() => ({}));
    return { ok: true, platform: body.platform };
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    return {
      ok: false,
      reason: `${e.name ? e.name + ": " : ""}${e.message ?? "Could not enable notifications."}`,
    };
  }
}
