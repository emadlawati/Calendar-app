"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";

export default function BirthdayInviteButton() {
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await fetch("/api/birthday-invite", { method: "POST" });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch { /* ignore */ }
    setIsSending(false);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleSend}
      disabled={isSending || sent}
      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border shadow-sm transition-colors"
      style={{
        background: sent ? "#fce4ec" : "var(--card-bg)",
        borderColor: sent ? "#f48fb1" : "var(--card-border)",
        color: "var(--text)",
        opacity: isSending ? 0.7 : 1,
      }}
    >
      <span style={{ color: sent ? "#e91e63" : "#d81b60" }}><Gift size={14} /></span>
      <span className="text-xs sm:text-sm font-medium">
        {isSending ? "Sending..." : sent ? "Sent! 🎂" : "🎂 Slideshow"}
      </span>
    </motion.button>
  );
}
