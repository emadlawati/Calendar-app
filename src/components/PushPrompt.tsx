"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useState, useEffect } from "react";

type State = "unsupported" | "pending" | "loading" | "denied" | "subscribed";

export default function PushPrompt() {
  const [state, setState] = useState<State>("loading");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) { setState("unsupported"); return; }
    if (!("PushManager" in window)) { setState("unsupported"); return; }
    if (!("Notification" in window)) { setState("unsupported"); return; }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) =>
        reg.pushManager.getSubscription().then((sub) => {
          setState(sub ? "subscribed" : "pending");
        })
      )
      .catch(() => setState("unsupported"));
  }, []);

  // Auto-hide once subscribed
  if (state === "subscribed" || state === "loading" || state === "unsupported" || dismissed) {
    return null;
  }

  const handleSubscribe = async () => {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setState("denied"); return; }

    // Test notification to confirm it works
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification("🎉 All set!", {
      body: "You'll get notified about new plans, nudges, and highlights.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "purrfect-subscribed",
    });

    // Try full push subscription for remote notifications
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (key) {
      try {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          applicationServerKey: b64ToU8(key) as any,
        });
        const raw = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ endpoint: raw.endpoint, keys: raw.keys }),
        });
      } catch { /* non-critical */ }
    }

    setState("subscribed");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-8 sm:w-80 z-[90] note-card p-4"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <Bell size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {state === "denied" ? "Notifications blocked" : "Get notified in the app!"}
              </p>
              <button onClick={() => setDismissed(true)} style={{ color: "var(--text-soft)", opacity: 0.5 }}>
                <X size={14} />
              </button>
            </div>
            <p className="text-[11px] mt-0.5 mb-2" style={{ color: "var(--text-soft)" }}>
              {state === "denied"
                ? "Re-enable in browser settings → Site Settings → Notifications."
                : "New plans, reminders, and nudges — straight to your phone."}
            </p>
            {state !== "denied" && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleSubscribe}
                className="chip-pill text-xs font-semibold"
                style={{
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  borderColor: "var(--accent)",
                }}
              >
                Enable notifications
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function b64ToU8(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array(Buffer.from(s, "base64"));
}
