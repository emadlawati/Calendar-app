"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { triggerConfetti } from "@/lib/confetti";
import { getCategoryById, EVENT_CATEGORIES } from "@/lib/categories";
import { getDisplayName } from "@/lib/names";
import { CategoryIcons, CalendarIcon, XIcon, SendIcon, CheckIcon, ArchiveIcon } from "@/components/icons";
import type { CalendarEvent } from "@/lib/types";

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBadges?: { id: string; label: string; emoji: string }[]) => void;
  event: CalendarEvent | null;
  onSaveMemory?: (event: CalendarEvent) => void;
}

export default function DetailsModal({ isOpen, onClose, onSuccess, event, onSaveMemory }: DetailsModalProps) {
  const { user: currentUser } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Reset edit mode when modal closes or event changes
  useEffect(() => {
    setIsEditing(false);
    setEditError("");
  }, [isOpen, event]);

  // Populate edit fields when entering edit mode
  useEffect(() => {
    if (isEditing && event) {
      setEditTitle(event.title);
      setEditDate((event.date as string).split("T")[0]);
      setEditTime(event.time || "");
      setEditEndTime(event.endTime || "");
      setEditNotes(event.notes || "");
      setEditCategory(event.category || "other");
    }
  }, [isEditing, event]);

  if (!event) return null;

  const isPartner = event.createdBy !== currentUser;
  const isPending = event.status === "pending";
  const isAccepted = event.status === "accepted";
  const datePart = (event.date as string).split("T")[0];
  const eventStart = new Date(`${datePart}T${event.time || "00:00"}:00+04:00`);
  const hasStarted = eventStart <= new Date() && event.status === "accepted";
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEdit(true);
    setEditError("");
    try {
      const res = await fetch('/api/events/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "same-origin",
        body: JSON.stringify({
          action: 'edit',
          eventId: event.id,
          user: currentUser,
          title: editTitle,
          date: editDate,
          time: editTime,
          endTime: editEndTime || null,
          notes: editNotes || null,
          category: editCategory,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onSuccess();
      onClose();
    } catch {
      setEditError("Failed to save changes. Please try again.");
    }
    setIsSavingEdit(false);
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
                {isEditing ? "Edit Plan" : "Plan Details"}
              </h2>
            </div>

            {isEditing ? (
              /* ── Edit Form ── */
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="field-label">Title</label>
                  <input
                    required
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Event title"
                  />
                </div>

                <div>
                  <label className="field-label">Category</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EVENT_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditCategory(c.id)}
                        className="flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium border-2 transition-all"
                        style={{
                          borderColor: editCategory === c.id ? "var(--accent)" : "var(--divider)",
                          background: editCategory === c.id ? "var(--accent-soft)" : "var(--input-bg)",
                          color: "var(--text)",
                        }}
                      >
                        <span className="text-base">{c.emoji}</span>
                        <span className="text-[9px] leading-tight opacity-70">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Date</label>
                    <input required type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Time</label>
                    <input required type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="field-label">End Time <span className="opacity-50 font-normal">(optional)</span></label>
                  <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
                </div>

                <div>
                  <label className="field-label">Notes <span className="opacity-50 font-normal">(optional)</span></label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Any notes…"
                    className="min-h-[72px]"
                  />
                </div>

                {editError && (
                  <p className="text-xs rounded-xl py-2 px-3" style={{ color: "#c14a33", background: "rgba(193,74,51,0.08)" }}>
                    {editError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="py-3 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--chip-bg)", color: "var(--chip-text)" }}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={isSavingEdit}
                    className="py-3 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--accent)", color: "var(--on-accent)", opacity: isSavingEdit ? 0.7 : 1 }}
                  >
                    {isSavingEdit ? "Saving…" : "Save Changes"}
                  </motion.button>
                </div>
              </form>
            ) : (
              /* ── View Mode ── */
              <>
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
                      {event.status === "accepted" && !hasStarted && (() => {
                        const daysUntil = Math.ceil((eventStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <p className="text-[11px] mt-0.5 font-medium" style={{ color: "var(--accent)" }}>
                            {daysUntil === 0 ? "Today! 🎉" : daysUntil === 1 ? "Tomorrow 🗓️" : `In ${daysUntil} days 🗓️`}
                          </p>
                        );
                      })()}
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
                    {/* Edit button — only for accepted events */}
                    {isAccepted && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2"
                        style={{ color: "var(--text-soft)" }}
                        title="Edit event"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
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

                {/* Save / Edit Memory button for past events */}
                {hasStarted && (
                  event.memoryId ? (
                    <Link
                      href="/memories"
                      onClick={onClose}
                      className="w-full mt-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                      style={{ background: "var(--chip-bg)", color: "var(--accent)", display: "flex" }}
                    >
                      📸 View / Edit Memory
                    </Link>
                  ) : onSaveMemory && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { onSaveMemory(event); onClose(); }}
                      className="w-full mt-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      📸 Save Memory
                    </motion.button>
                  )
                )}

                <button onClick={onClose}
                  className="w-full mt-5 text-sm uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-soft)" }}>
                  Go Back
                </button>
              </>
            )}
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
