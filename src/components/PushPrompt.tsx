"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X } from "lucide-react";
import usePushNotifications from "@/lib/usePushNotifications";

export default function PushPrompt() {
  const { state, subscribe, unsubscribe } = usePushNotifications();

  if (state === "unsupported" || state === "subscribed") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-8 sm:w-72 z-[90] note-card p-4"
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
                ? "Re-enable in browser settings."
                : "New plans, reminders, and nudges — straight to your phone."}
            </p>
            {state !== "denied" && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={subscribe}
                className="chip-pill text-xs font-semibold"
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
