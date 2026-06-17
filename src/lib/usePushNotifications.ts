"use client";

import { useEffect, useState, useCallback } from "react";

type State = "unsupported" | "pending" | "loading" | "denied" | "subscribed";

export default function usePushNotifications() {
  const [state, setState] = useState<State>("loading");
  const [publicKey, setPublicKey] = useState<string>("");

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
    setPublicKey(key);

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (!key) {
      setState("pending");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) =>
        reg.pushManager.getSubscription().then((sub) => {
          setState(sub ? "subscribed" : "pending");
        })
      )
      .catch((err: unknown) => {
        console.warn("SW registration failed:", err);
        setState("unsupported");
      });
  }, []);

  const subscribe = useCallback(async () => {
    const key = publicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
    if (!key) {
      alert("Push notifications aren't configured yet. Add the VAPID keys to Vercel first.");
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); return false; }
      const reg = await navigator.serviceWorker.ready;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToU8(key) as any,
      });
      const raw = sub.toJSON();
      const keys = raw.keys as { p256dh: string; auth: string };
      await fetch("/api/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ endpoint: raw.endpoint, keys }),
      });
      setState("subscribed");
      return true;
    } catch (err: unknown) {
      console.error("Push subscribe failed:", err);
      setState("denied");
      return false;
    }
  }, [publicKey]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("pending");
    } catch { /* ignore */ }
  }, []);

  return { state, subscribe, unsubscribe };
}

function b64ToU8(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Buffer.from(s, "base64");
  return new Uint8Array(bytes);
}
