"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { triggerConfetti } from "@/lib/confetti";
import { getCategoryById, EVENT_CATEGORIES } from "@/lib/categories";
import { getDisplayName } from "@/lib/names";
import {
  CategoryIcons, CalendarIcon, XIcon, SendIcon, CheckIcon, ArchiveIcon,
  PencilIcon, CameraIcon, CelebrateIcon, PersonIcons,
} from "@/components/icons";
import { specialDateLabel, linkableSpecialDates } from "@/lib/special-date-display";
import { PEOPLE, getPersonById } from "@/lib/people";
import type { CalendarEvent, SpecialDateWithCountdown } from "@/lib/types";

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
  const [editEndDate, setEditEndDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editSpecialDateId, setEditSpecialDateId] = useState<string | null>(null);
  const [editPersonTag, setEditPersonTag] = useState<string | null>(null);
  const [specialDates, setSpecialDates] = useState<SpecialDateWithCountdown[]>([]);
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
      setEditEndDate(event.endDate ? (event.endDate as string).split("T")[0] : "");
      setEditTime(event.time || "");
      setEditEndTime(event.endTime || "");
      setEditNotes(event.notes || "");
      setEditCategory(event.category || "other");
      setEditSpecialDateId(event.specialDateId || null);
      setEditPersonTag(event.personTag || null);
    }
  }, [isEditing, event]);

  // Load anniversaries/birthdays once the modal is open, so both the view
  // badge and the edit picker can resolve the linked date.
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/special-dates", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSpecialDates(data); })
      .catch(() => {});
  }, [isOpen]);

  if (!event) return null;

  const isPartner = event.createdBy !== currentUser;
  const isPending = event.status === "pending";
  const datePart = (event.date as string).split("T")[0];
  const endDatePart = event.endDate ? (event.endDate as string).split("T")[0] : null;
  const eventStart = new Date(`${datePart}T${event.time || "00:00"}:00+04:00`);
  const eventSpanEnd = endDatePart ? new Date(`${endDatePart}T23:59:59+04:00`) : null;
  const isOngoing = !!eventSpanEnd && eventStart <= new Date() && new Date() <= eventSpanEnd && event.status === "accepted";
  const hasStarted = eventStart <= new Date() && event.status === "accepted";
  const cat = getCategoryById(event.category);
  const Icon = CategoryIcons[cat.id];
  const linkedSpecialDate = event.specialDateId
    ? specialDates.find((sd) => sd.id === event.specialDateId) ?? null
    : null;
  const linkedPerson = getPersonById(event.personTag);
  // Part of a repeating series — accepting one occurrence accepts them all
  const isRecurring = !!event.seriesId || !!event.isRecurringInstance;

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
    setEditError("");
    if (editEndDate && editEndDate < editDate) {
      setEditError("End date can't be before the start date.");
      return;
    }
    setIsSavingEdit(true);
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
          endDate: editEndDate && editEndDate !== editDate ? editEndDate : null,
          time: editTime,
          endTime: editEndTime || null,
          notes: editNotes || null,
          category: editCategory,
          specialDateId: editSpecialDateId,
          personTag: editPersonTag,
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        width="sm"
        ariaLabel={isEditing ? "Edit plan" : "Plan details"}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
              <CalendarIcon size={20} />
            </div>
            <h2 className="heading-font text-xl" style={{ color: "var(--accent)" }}>
              {isEditing ? "Edit Plan" : "Plan Details"}
            </h2>
          </div>
        }
      >
        <div className="mt-1">
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
                        <span className="text-base">
                          {(() => { const CIcon = CategoryIcons[c.id]; return CIcon ? <CIcon size={18} /> : c.emoji; })()}
                        </span>
                        <span className="text-[10px] leading-tight opacity-70">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {linkableSpecialDates(specialDates).length > 0 && (
                  <div>
                    <label className="field-label">Link to an anniversary?</label>
                    <select
                      value={editSpecialDateId || ""}
                      onChange={(e) => setEditSpecialDateId(e.target.value || null)}
                      className="w-full px-3 py-2.5 rounded-xl text-[13px] font-medium outline-none border transition-colors"
                      style={{
                        background: editSpecialDateId ? "var(--accent-soft)" : "var(--input-bg)",
                        borderColor: editSpecialDateId ? "var(--accent)" : "var(--input-border)",
                        color: editSpecialDateId ? "var(--accent)" : "var(--text)",
                      }}
                    >
                      <option value="">None</option>
                      {linkableSpecialDates(specialDates).map((sd) => (
                        <option key={sd.id} value={sd.id}>
                          {specialDateLabel(sd)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="field-label">Who is this for?</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PEOPLE.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEditPersonTag(editPersonTag === p.id ? null : p.id)}
                        className="flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium border-2 transition-all"
                        style={{
                          borderColor: editPersonTag === p.id ? "var(--accent)" : "var(--divider)",
                          background: editPersonTag === p.id ? "var(--accent-soft)" : "var(--input-bg)",
                          color: "var(--text)",
                        }}
                      >
                        <span className="text-base">
                          {(() => { const PIcon = PersonIcons[p.id]; return PIcon ? <PIcon size={18} /> : p.emoji; })()}
                        </span>
                        <span className="text-[10px] leading-tight opacity-70 truncate max-w-full">{p.label}</span>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">End Time <span className="opacity-50 font-normal">(optional)</span></label>
                    <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">End Date <span className="opacity-50 font-normal">(optional)</span></label>
                    <input type="date" value={editEndDate} min={editDate} onChange={(e) => setEditEndDate(e.target.value)} />
                  </div>
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
                  <p className="text-xs rounded-xl py-2 px-3" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
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
                  {linkedSpecialDate && (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider ml-1.5"
                      style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                      {specialDateLabel(linkedSpecialDate)}
                    </span>
                  )}
                  {linkedPerson && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider ml-1.5"
                      style={{ background: linkedPerson.color, color: linkedPerson.textColor }}>
                      {(() => { const PIcon = PersonIcons[linkedPerson.id]; return PIcon ? <PIcon size={11} /> : linkedPerson.emoji; })()} {linkedPerson.label}
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
                        {event.endDate && ` → ${new Date(event.endDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}
                        {event.allDay ? " · All day" : ` @ ${event.time}`}
                      </span>
                      {isOngoing ? (
                        <p className="text-[11px] mt-0.5 font-medium inline-flex items-center gap-1" style={{ color: "var(--accent)" }}>
                          Happening now <CelebrateIcon size={11} />
                        </p>
                      ) : event.status === "accepted" && !hasStarted && (() => {
                        const daysUntil = Math.ceil((eventStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <p className="text-[11px] mt-0.5 font-medium inline-flex items-center gap-1" style={{ color: "var(--accent)" }}>
                            {daysUntil === 0 ? (<>Today! <CelebrateIcon size={11} /></>) : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
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
                      background: event.status === 'accepted' ? 'color-mix(in srgb, var(--success) 15%, transparent)' : "var(--chip-bg)",
                      color: event.status === 'accepted' ? 'var(--success)' : "var(--chip-text)",
                    }}>
                    {event.status}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Edit — available on any event, whatever its status */}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2"
                      style={{ color: "var(--text-soft)" }}
                      title="Edit event"
                      aria-label="Edit event"
                    >
                      <PencilIcon size={15} />
                    </button>
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
                      title={isRecurring ? "Accepts every occurrence in this series" : undefined}
                    >
                      <CheckIcon size={16} /> {isRecurring ? "Accept all" : "Accept"}
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
                {isPartner && isPending && isRecurring && (
                  <p className="text-[11px] text-center mt-2" style={{ color: "var(--text-soft)" }}>
                    Accepting will accept every occurrence in this series
                  </p>
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
                      <CameraIcon size={15} /> View / Edit Memory
                    </Link>
                  ) : onSaveMemory && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { onSaveMemory(event); onClose(); }}
                      className="w-full mt-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      <CameraIcon size={15} /> Save Memory
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
        </div>
      </Modal>

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
  );
}
