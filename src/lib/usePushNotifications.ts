"use client";

import { useEffect, useState } from "react";

type State = "unsupported" | "pending" | "granted" | "denied" | "subscribed";

export default function usePushNotifications() {
  const [state, setState] = useState<State>("pending");
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    setPublicKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null);
  }, []);

  useEffect(() => {
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setState("subscribed");
        } else {
          setState("pending");
        }
      });
    }).catch(() => {
      setState("unsupported");
    });
  }, [publicKey]);

  const subscribe = async () => {
    if (!publicKey) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      const raw = sub.toJSON();
      const keys = raw.keys as { p256dh: string; auth: string };

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ endpoint: raw.endpoint, keys }),
      });

      setState("subscribed");
      return true;
    } catch (err) {
      console.error("Push subscribe failed:", err);
      setState("denied");
      return false;
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("pending");
    } catch { /* ignore */ }
  };

  return { state, subscribe, unsubscribe, publicKey };
}
