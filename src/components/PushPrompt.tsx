"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { XIcon } from "@/components/icons";
import { enablePush, pushSupported } from "@/lib/push-client";

const DISMISSED_KEY = "push-prompt-dismissed";

/**
 * A quiet nudge on the home page for anyone who hasn't registered a device.
 *
 * It no longer claims success it hasn't verified: enabling goes through the
 * same path as the settings panel, and a failure says what actually failed
 * instead of blaming the VAPID keys.
 */
export default function PushPrompt() {
  const [show, setShow] = useState(false);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch { /* private mode */ }

    // Only ask people who have no device registered *on the server* — the
    // browser having a subscription is not the same as us being able to use it.
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const local = await reg.pushManager.getSubscription();
        const res = await fetch("/api/push/test");
        if (!res.ok) return;
        const { devices } = await res.json();
        const mine = (devices ?? []).filter((d: { mine: boolean }) => d.mine);
        if (!local || mine.length === 0) setShow(true);
      } catch { /* leave it alone */ }
    })();
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* private mode */ }
  };

  const handleSubscribe = async () => {
    setBusy(true);
    setProblem("");
    const result = await enablePush();
    setBusy(false);
    if (result.ok) {
      setShow(false);
      return;
    }
    setProblem(result.reason);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-8 sm:w-80 z-[90] rr-card p-4"
        style={{ background: "var(--card)", border: "1px solid var(--rule-strong)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="rr-label">Notifications</p>
          <button onClick={dismiss} aria-label="Dismiss" style={{ color: "var(--faint)" }}>
            <XIcon size={14} />
          </button>
        </div>

        <p className="rr-italic mt-1.5" style={{ fontSize: 15, color: "var(--muted)" }}>
          {problem
            ? "This device couldn't be registered."
            : "This device isn't set up to receive anything yet."}
        </p>

        {problem && (
          <p className="mt-2" style={{ fontSize: 12.5, color: "var(--terracotta)" }}>{problem}</p>
        )}

        <div className="flex items-center gap-3 mt-3">
          <button className="rr-btn-quiet" onClick={handleSubscribe} disabled={busy}>
            {busy ? "Working…" : problem ? "Try again" : "Turn them on"}
          </button>
          <a href="/shelf" className="rr-action" style={{ fontSize: 12 }}>Settings</a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
