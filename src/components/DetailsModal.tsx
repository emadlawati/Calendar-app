"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/components/SessionProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { triggerConfetti } from "@/lib/confetti";
import { getCategoryById } from "@/lib/categories";
import { getDisplayName } from "@/lib/names";
import { CategoryIcons, CalendarIcon, XIcon, SendIcon, CheckIcon, ArchiveIcon } from "@/components/icons";
import type { CalendarEvent } from "@/lib/types";

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBadges?: { id: string; label: string; emoji: string }[]) => void;
  event: CalendarEvent | null;
}

export default function DetailsModal({ isOpen, onClose, onSuccess, event }: DetailsModalProps) {
  const { user: currentUser } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!event) return null;

  const isPartner = event.createdBy !== currentUser;
  const isPending = event.status === "pending";
  const cat = getCategoryById(event.category);
  const Icon = CategoryIcons[cat.id];

  const handleAction = async (action: string) => {
    try {
      if (action === 'delete') setIsDeleting(true);
      const res = await fetch('/api/events/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "same-origin",
        body: JSON.stringify({ action, eventId: event.id, user: currentUser })
      });
      if (res.ok) {
        setShowConfirmDelete(false);
        const data = await res.json();
        if (action === "accept") {
          triggerConfetti();
          if (data.newBadges?.length > 0) {
            onSuccess(data.newBadges);
            onClose();
            return;
          }
        }
        onSuccess();
        onClose();
      }
    } catch { /* ignore */ }
    setIsDeleting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40" style={{ background: "rgba(40, 25, 15, 0.45)", backdropFilter: "blur(6px)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="fixed inset-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 md:max-w-sm w-full overflow-y-auto modal-shell p-6"
          >
            <button onClick={onClose} className="absolute top-4 right-4" style={{ color: "var(--text-soft)" }}>
              <XIcon size={20} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                <CalendarIcon size={20} />
              </div>
              <h2 className="text-xl" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
                Plan Details
              </h2>
            </div>

            {/* Title + Category */}
            <div className="p-4 rounded-2xl mb-4" style={{ background: "var(--input-bg)", border: "1px solid var(--divider)" }}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>{event.title}</h3>
                <Icon size={16} color={cat.textColor} />
              </div>
              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                style={{ background: cat.color, color: cat.textColor }}>
                {cat.label}
              </span>
              {event.isRecurringInstance && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ml-1.5"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  recurring
                </span>
              )}
            </div>

            <div className="space-y-3 mb-5">
              {/* When */}
              <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--chip-bg)" }}>
                  <CalendarIcon size={16} color="var(--text-soft)" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold opacity-50">When</p>
                  <span>
                    {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    {event.allDay ? " · All day" : ` @ ${event.time}`}
                  </span>
                </div>
              </div>

              {/* Proposed By */}
              <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: cat.color, color: cat.textColor }}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold opacity-50">Proposed By</p>
                  <span>{getDisplayName(event.createdBy)}</span>
                </div>
              </div>

              {/* Notes */}
              {event.notes && (
                <div className="flex gap-3" style={{ color: "var(--text)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--chip-bg)", color: "var(--text-soft)" }}>
                    <SendIcon size={14} />
                  </div>
                  <div className="p-3 rounded-2xl flex-1 relative" style={{ background: "var(--card-bg)", border: "1px solid var(--divider)" }}>
                    <p className="text-sm italic">&ldquo;{event.notes}&rdquo;</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status + actions */}
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--divider)" }}>
              <span className="text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider"
                style={{
                  background: event.status === 'accepted' ? 'rgba(106, 180, 120, 0.15)' : "var(--chip-bg)",
                  color: event.status === 'accepted' ? '#4a7c5c' : "var(--chip-text)",
                }}>
                {event.status}
              </span>

              <div className="flex items-center gap-1">
                <button onClick={() => handleAction(event.archived ? 'unarchive' : 'archive')}
                  className="p-2 text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-soft)" }}>
                  <ArchiveIcon size={16} />
                </button>
                <button onClick={() => setShowConfirmDelete(true)} disabled={isDeleting}
                  className="p-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-soft)" }}>
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* Accept / Adjust buttons */}
            {isPartner && isPending && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAction('accept')}
                  className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: cat.color, color: cat.textColor }}
                >
                  <CheckIcon size={16} /> Accept
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { router.push(`/events/adjust?id=${event.id}`); onClose(); }}
                  className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: "var(--chip-bg)", color: "var(--chip-text)" }}
                >
                  <SendIcon size={14} /> Adjust
                </motion.button>
              </div>
            )}

            <button onClick={onClose}
              className="w-full mt-5 text-sm uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-soft)" }}>
              Go Back
            </button>
          </motion.div>

          <ConfirmDialog
            isOpen={showConfirmDelete}
            onClose={() => setShowConfirmDelete(false)}
            onConfirm={() => handleAction('delete')}
            title="Delete Plan?"
            message="Are you sure? This can't be undone."
            confirmLabel="Delete"
            isLoading={isDeleting}
          />
        </>
      )}
    </AnimatePresence>
  );
}
