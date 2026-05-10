"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";

export default function NudgeButton() {
  const [isSending, setIsSending] = useState(false);

  const handleNudge = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/nudge", { method: "POST", credentials: "same-origin" });
      const data = await res.json();
      if (data.success) {
        // The page.tsx toast handler will catch events
        window.dispatchEvent(new CustomEvent("nudge-sent", { detail: data.message }));
      }
    } catch (err) {
      console.error("Nudge failed:", err);
    } finally {
      setTimeout(() => setIsSending(false), 1500);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      onClick={handleNudge}
      disabled={isSending}
      className="relative flex items-center justify-center w-9 h-9 disabled:opacity-50"
    >
      <motion.div
        animate={isSending ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] } : {}}
        transition={{ duration: 0.6, repeat: isSending ? Infinity : 0 }}
      >
        <Heart
          size={22}
          className={`transition-colors ${
            isSending ? "fill-red-400 text-red-400" : "fill-red-400/20 text-red-400/70 hover:fill-red-400/50 hover:text-red-400"
          }`}
        />
      </motion.div>
    </motion.button>
  );
}
