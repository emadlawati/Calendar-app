"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useState, useEffect } from "react";

type State = "unsupported" | "pending" | "loading" | "denied" | "subscribed";

export default function PushPrompt() {
  const [state, setState] = useState<State>("loading");
  const [debug, setDebug] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const log = (msg: string) => setDebug((prev) => [...prev.slice(-10), msg]);

    log("Starting push check...");

    if (!("serviceWorker" in navigator)) {
      log("❌ No serviceWorker support");
      setState("unsupported");
      return;
    }
    log("✓ serviceWorker supported");

    if (!("PushManager" in window)) {
      log("❌ No PushManager");
      setState("unsupported");
      return;
    }
    log("✓ PushManager supported");

    if (!("Notification" in window)) {
      log("❌ No Notification API");
      setState("unsupported");
      return;
    }
    log("✓ Notification API available");

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        log("✓ SW registered: " + (reg.active ? "active" : "waiting"));
        return reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            log("✓ Already subscribed");
            setState("subscribed");
          } else {
            log("○ Not subscribed yet");
            setState("pending");
          }
        });
      })
      .catch((err: unknown) => {
        log("❌ SW failed: " + String(err));
        setState("unsupported");
      });
  }, []);

  const handleTestNotification = async () => {
    setDebug((prev) => [...prev.slice(-10), "Requesting permission..."]);
    const perm = await Notification.requestPermission();
    setDebug((prev) => [...prev.slice(-10), "Permission: " + perm]);

    if (perm === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification("🎉 Test Notification!", {
          body: "Push notifications are working! You'll get plan invites, nudges, and highlights.",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "purrfect-test",
        });
        setDebug((prev) => [...prev.slice(-10), "✓ Test notification sent!"]);
        setState("subscribed");
      } catch (err) {
        setDebug((prev) => [...prev.slice(-10), "❌ Test failed: " + String(err)]);
      }
    } else {
      setState("denied");
    }
  };

  const tryFullSubscribe = async () => {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    setDebug((prev) => [...prev.slice(-10), "VAPID key: " + (key ? "present ✓" : "missing ❌ (need to add to Vercel)")]);

    if (!key) {
      setDebug((prev) => [...prev.slice(-10), "⚠️ Push works locally but VAPID keys are needed on Vercel for actual push delivery"]);
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
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
      setState("subscribed");
      setDebug((prev) => [...prev.slice(-10), "✓ Fully subscribed for remote push!"]);
    } catch (err) {
      setDebug((prev) => [...prev.slice(-10), "❌ Subscribe failed: " + String(err)]);
    }
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-8 sm:w-80 z-[90] space-y-2">
      {/* Main prompt */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="note-card p-4"
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <Bell size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Push Notifications
              </p>
              <button onClick={() => setDismissed(true)} style={{ color: "var(--text-soft)", opacity: 0.5 }}>
                <X size={14} />
              </button>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-soft)" }}>
              State: <strong>{state}</strong>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleTestNotification}
            className="flex-1 chip-pill text-xs font-semibold text-center"
            style={{
              background: "var(--accent)",
              color: "var(--on-accent)",
              borderColor: "var(--accent)",
            }}
          >
            🧪 Test
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={tryFullSubscribe}
            className="flex-1 chip-pill text-xs font-semibold text-center"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent)",
              borderColor: "var(--accent)",
            }}
          >
            Enable Push
          </motion.button>
        </div>
      </motion.div>

      {/* Debug log */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="note-card p-3 max-h-32 overflow-y-auto"
      >
        <p className="text-[10px] mb-1 opacity-50 font-semibold" style={{ color: "var(--text-soft)" }}>
          Debug log
        </p>
        {debug.map((line, i) => (
          <p key={i} className="text-[10px] leading-relaxed font-mono" style={{ color: line.startsWith("❌") ? "#c14a33" : line.startsWith("✓") ? "#4a8a4a" : "var(--text-soft)" }}>
            {line}
          </p>
        ))}
      </motion.div>
    </div>
  );
}

function b64ToU8(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array(Buffer.from(s, "base64"));
}
