"use client";

import { motion, AnimatePresence } from "framer-motion";
import { XIcon } from "@/components/icons";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  isLoading?: boolean;
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel, isLoading }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60]" style={{ background: "rgba(40, 25, 15, 0.5)", backdropFilter: "blur(4px)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-80 p-6 rounded-3xl shadow-xl"
            style={{ background: "var(--card-bg)" }}
          >
            <button onClick={onClose} className="absolute top-4 right-4" style={{ color: "var(--text-soft)" }}>
              <XIcon size={16} />
            </button>
            <h3 className="text-lg mb-2" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>{title}</h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-soft)" }}>{message}</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--chip-bg)", color: "var(--chip-text)" }}>
                Cancel
              </button>
              <button onClick={onConfirm} disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "#c14a33", color: "#fff" }}>
                {isLoading ? "..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
