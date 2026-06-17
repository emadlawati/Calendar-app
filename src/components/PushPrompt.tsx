"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import usePushNotifications from "@/lib/usePushNotifications";

export default function PushPrompt() {
  const { state, subscribe } = usePushNotifications();

  // Don't show anything while checking SW status
  if (state === "loading" || state === "unsupported") return null;

  // Already subscribed — all good, nothing to show
  if (state === "subscribed") return null;

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
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              {state === "denied"
                ? "Notifications blocked"
                : "Get notified in the app!"}
            </p>
            <p className="text-[11px] mb-2" style={{ color: "var(--text-soft)" }}>
              {state === "denied"
                ? "Re-enable in browser settings → Site Settings → Notifications."
                : "Tap below to allow push notifications on this device."}
            </p>
            {state !== "denied" && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={subscribe}
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
