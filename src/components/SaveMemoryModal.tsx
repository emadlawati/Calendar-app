"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X } from "lucide-react";

interface PendingMemory {
  event: { id: string; title: string; category: string | null };
  daysAgo: number;
}

interface RateDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pending: PendingMemory | null;
}

export default function SaveMemoryModal({ isOpen, onClose, onSuccess, pending }: RateDateModalProps) {
  const [journal, setJournal] = React.useState("");
  const [photoBase64, setPhotoBase64] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  if (!pending) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Photo must be under 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ eventId: pending.event.id, journal: journal || null, photoUrl: photoBase64 || null }),
      });
      if (!res.ok) throw new Error("Failed to save memory");
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
        onClose();
      }, 400);
    } catch {
      setError("Failed to save. Try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(40, 25, 15, 0.45)", backdropFilter: "blur(6px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 modal-shell w-[440px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-6"
          >
            <button onClick={onClose} className="absolute top-4 right-4" style={{ color: "var(--text-soft)" }}>
              <X size={20} />
            </button>

            <h2 className="text-xl mb-1" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
              Save the Memory
            </h2>
            <p className="text-xs mb-5" style={{ color: "var(--text-soft)" }}>
              {pending.event.title} · {pending.daysAgo} {pending.daysAgo === 1 ? "day" : "days"} ago
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="field-label">Journal</label>
                <textarea
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="What made this date special?"
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="field-label">Photo</label>
                {photoBase64 ? (
                  <div className="relative rounded-xl overflow-hidden mb-2">
                    <img src={photoBase64} alt="Memory" className="w-full h-48 object-cover" />
                    <button type="button" onClick={() => setPhotoBase64(null)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:opacity-80"
                    style={{ borderColor: "var(--input-border)", color: "var(--text-soft)" }}>
                    <Camera size={28} strokeWidth={1.5} />
                    <span className="text-xs">Add a photo (optional)</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                )}
              </div>

              {error && <p className="text-xs" style={{ color: "#c14a33" }}>{error}</p>}

              <button type="submit" disabled={isSubmitting} className="btn-send w-full justify-center">
                {isSubmitting ? "Saving..." : "Save Memory"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
