"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { XIcon, PawIcon } from "@/components/icons";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, isVisible, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => onClose(), duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div className="note-card px-5 py-3.5 flex items-center gap-3 shadow-lg" style={{ color: "var(--text)" }}>
            <PawIcon size={16} style={{ color: "var(--accent)" }} />
            <p className="text-sm font-medium">{message}</p>
            <button onClick={onClose} style={{ color: "var(--text-soft)" }}>
              <XIcon size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
