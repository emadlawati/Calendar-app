"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "./SessionProvider";
import { getDisplayName } from "@/lib/names";
import { EVENT_CATEGORIES, getCategoryById } from "@/lib/categories";
import { CategoryIcons, CalendarIcon, XIcon, SendIcon, SunIcon, TargetIcon, HeartIcon, CheckIcon } from "@/components/icons";
import type { CreateEventPayload, BucketItem } from "@/lib/types";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedDate?: Date;
}

export default function EventModal({ isOpen, onClose, onSuccess, selectedDate }: EventModalProps) {
  const { user } = useSession();
  const currentUser = user!;
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selectedDate ? selectedDate.toISOString().split('T')[0] : "");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("other");
  const [allDay, setAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showBucketPicker, setShowBucketPicker] = useState(false);
  const [bucketItems, setBucketItems] = useState<BucketItem[]>([]);
  const [bucketLoading, setBucketLoading] = useState(false);

  const partner = currentUser === "Wife" ? "Husband" : "Wife";
  const partnerDisplay = getDisplayName(partner);

  const loadBucketItems = async () => {
    setBucketLoading(true);
    try {
      const res = await fetch("/api/bucket");
      const data = await res.json();
      if (Array.isArray(data)) setBucketItems(data.filter((i: BucketItem) => !i.completed));
    } catch { /* ignore */ }
    setBucketLoading(false);
    setShowBucketPicker((prev) => !prev);
  };

  const pickFromBucket = (item: BucketItem) => {
    setTitle(item.title);
    setCategory(item.category);
    if (item.notes) setNotes(item.notes);
    setShowBucketPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload: CreateEventPayload = {
      title,
      date,
      time: allDay ? "00:00" : time,
      endTime: allDay ? "23:59" : (endTime || undefined),
      notes,
      category,
      allDay,
      createdBy: currentUser,
    };

    try {
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create event. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setTimeout(() => {
        setIsSubmitting(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 600);
    } catch {
      setError("Network error. Please check your connection.");
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(40, 25, 15, 0.45)", backdropFilter: "blur(6px)" }}
          />

          {/* Modal shell */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 modal-shell flex flex-col w-[720px] max-w-[95vw] max-h-[88vh]"
          >
            {/* Header strip */}
            <div className="flex items-center justify-between px-6 py-5 border-b"
              style={{
                background: "linear-gradient(180deg, #fbeed7 0%, var(--card-bg) 100%)",
                borderColor: "var(--divider)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h2 className="text-[22px] leading-tight" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
                    Plan a Date
                  </h2>
                  <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                    A new memory for the books ♥
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="relative z-10 w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.6)", color: "var(--text-soft)" }}
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* 2-COLUMN BODY */}
            <form onSubmit={handleSubmit} className="overflow-y-auto">
              <div className="grid gap-5 p-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {/* LEFT COLUMN */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="field-label">What are we doing?</label>
                    <input
                      required
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Movie night & cuddles"
                    />
                    <button
                      type="button"
                      onClick={loadBucketItems}
                      className="mt-2 text-[12.5px] font-medium flex items-center gap-1.5 transition-opacity hover:opacity-70"
                      style={{ color: "var(--accent)" }}
                    >
                      <TargetIcon size={14} /> Pick from Bucket List
                    </button>
                    {showBucketPicker && (
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto rounded-xl p-2" style={{ background: "var(--input-bg)", border: "1.5px solid var(--input-border)" }}>
                        {bucketLoading ? (
                          <p className="text-xs text-center py-2" style={{ color: "var(--text-soft)" }}>Loading...</p>
                        ) : bucketItems.length === 0 ? (
                          <p className="text-xs text-center py-2" style={{ color: "var(--text-soft)" }}>Empty bucket — add ideas first</p>
                        ) : (
                          bucketItems.map((item) => (
                            <button key={item.id} type="button" onClick={() => pickFromBucket(item)}
                              className="w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-white/50 transition-colors"
                              style={{ color: "var(--accent)" }}
                            >
                              <span>{getCategoryById(item.category).emoji}</span>
                              <span className="truncate">{item.title}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="field-label">Category</label>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                      {EVENT_CATEGORIES.map((cat) => {
                        const Icon = CategoryIcons[cat.id];
                        const selected = category === cat.id;
                        return (
                          <motion.button
                            key={cat.id}
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setCategory(cat.id)}
                            className="flex items-center gap-2 py-2 px-3 rounded-xl text-[12.5px] font-medium transition-all"
                            style={{
                              background: selected ? cat.color : "transparent",
                              border: `1.5px solid ${selected ? cat.dotColor : "var(--input-border)"}`,
                              color: selected ? cat.textColor : "var(--text)",
                              fontWeight: selected ? 600 : 500,
                            }}
                          >
                            <Icon size={16} color={selected ? cat.textColor : "var(--text-soft)"} />
                            {cat.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-4">
                  {/* When */}
                  <div>
                    <label className="field-label">When?</label>
                    <div className="flex gap-2">
                      <input
                        required
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="flex-1"
                      />
                      {!allDay && (
                        <input
                          type="time"
                          value={time}
                          onChange={e => setTime(e.target.value)}
                          style={{ width: 110 }}
                        />
                      )}
                    </div>
                    {!allDay && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="time"
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                          placeholder="End"
                          style={{ width: 110 }}
                        />
                        <span className="text-[11.5px] self-center" style={{ color: "var(--text-very)" }}>
                          optional end
                        </span>
                      </div>
                    )}

                    {/* All-day toggle */}
                    <label
                      className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-[13px] font-medium transition-all ${
                        allDay ? "all-day-active" : ""
                      }`}
                      style={{
                        background: allDay ? "#fae3b8" : "var(--input-bg)",
                        border: `1.5px solid ${allDay ? "#d99a1c" : "var(--input-border)"}`,
                        color: allDay ? "#7a4f10" : "var(--text)",
                      }}
                    >
                      <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} hidden />
                      <span
                        className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background: allDay ? "#d99a1c" : "transparent",
                          border: allDay ? "none" : "1.5px solid var(--input-border)",
                        }}
                      >
                        {allDay && <CheckIcon size={12} color="#fff" />}
                      </span>
                      <SunIcon size={14} />
                      All day
                    </label>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="field-label">
                      Meow Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Don't forget to bring snacks..."
                      className="w-full rounded-xl p-3 text-[13.5px] resize-none outline-none"
                      style={{
                        minHeight: 96,
                        lineHeight: 1.5,
                        background: "var(--input-bg)",
                        border: "1.5px solid var(--input-border)",
                        color: "var(--text)",
                        fontFamily: "var(--font-outfit), sans-serif",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mx-6 mb-3 p-3 rounded-xl text-sm text-center" style={{ background: "rgba(193, 74, 51, 0.1)", color: "#9b3a2a", border: "1px solid rgba(193, 74, 51, 0.2)" }}>
                  {error}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t"
                style={{ background: "#fbf2e1", borderColor: "var(--divider)" }}
              >
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-soft)" }}>
                  <HeartIcon size={13} color="#c14a33" />
                  {partnerDisplay} will be notified
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ color: "var(--text-soft)" }}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-send flex items-center gap-2"
                  >
                    <SendIcon size={14} />
                    {isSubmitting ? "Sending..." : "Send Invite"}
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
