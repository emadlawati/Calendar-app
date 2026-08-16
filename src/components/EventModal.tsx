"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import { useSession } from "./SessionProvider";
import { getDisplayName } from "@/lib/names";
import { EVENT_CATEGORIES, getCategoryById } from "@/lib/categories";
import { CategoryIcons, CalendarIcon, SendIcon, SunIcon, TargetIcon, HeartIcon, CheckIcon, PersonIcons } from "@/components/icons";
import RecurrenceSelector, { type RecurrenceOption } from "./RecurrenceSelector";
import { specialDateLabel, linkableSpecialDates } from "@/lib/special-date-display";
import { PEOPLE } from "@/lib/people";
import type { CreateEventPayload, BucketItem, SpecialDateWithCountdown } from "@/lib/types";

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
  const [endDate, setEndDate] = useState("");
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
  const [recurrence, setRecurrence] = useState<RecurrenceOption>("once");
  const [specialDateId, setSpecialDateId] = useState<string | null>(null);
  const [personTag, setPersonTag] = useState<string | null>(null);
  const [specialDates, setSpecialDates] = useState<SpecialDateWithCountdown[]>([]);

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

  // Fetch special dates when modal opens
  const loadSpecialDates = () => {
    fetch("/api/special-dates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSpecialDates(linkableSpecialDates(data));
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) loadSpecialDates();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Multi-day validation (only for one-off events)
    if (recurrence === "once" && endDate && endDate < date) {
      setError("End date can't be before the start date.");
      return;
    }

    setIsSubmitting(true);

    const payload: CreateEventPayload = {
      title,
      date,
      endDate: recurrence === "once" && endDate && endDate !== date ? endDate : undefined,
      time: allDay ? "00:00" : time,
      endTime: allDay ? "23:59" : (endTime || undefined),
      notes,
      category,
      allDay,
      createdBy: currentUser,
      specialDateId: specialDateId || undefined,
      personTag: personTag || undefined,
    };

    try {
      const res = await fetch(recurrence !== "once" ? '/api/recurring' : '/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "same-origin",
        body: JSON.stringify(recurrence !== "once" ? { ...payload, frequency: recurrence } : payload)
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="lg"
      ariaLabel="Plan a date"
      title={
        <div
          className="-mx-6 -mt-5 -mb-3 px-6 py-5 border-b flex items-center gap-3 pr-14"
          style={{
            background: "linear-gradient(180deg, var(--panel-soft) 0%, var(--card-bg) 100%)",
            borderColor: "var(--divider)",
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="heading-font text-[22px] leading-tight" style={{ color: "var(--accent)" }}>
              Plan a Date
            </h2>
            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
              A new memory for the books
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-soft)" }}>
            <HeartIcon size={13} color="var(--danger)" />
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
              form="event-create-form"
              disabled={isSubmitting}
              className="btn-send flex items-center gap-2"
            >
              <SendIcon size={14} />
              {isSubmitting ? "Sending..." : "Send Invite"}
            </motion.button>
          </div>
        </div>
      }
    >
      <form id="event-create-form" onSubmit={handleSubmit} className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
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
                className="mt-2 text-[13px] font-medium flex items-center gap-1.5 transition-opacity hover:opacity-70"
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
                        className="w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                        style={{ color: "var(--accent)" }}
                      >
                        <span className="flex items-center">
                          {(() => { const BIcon = CategoryIcons[getCategoryById(item.category).id]; return BIcon ? <BIcon size={14} /> : null; })()}
                        </span>
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
                      className="flex items-center gap-2 py-2 px-3 rounded-xl text-[13px] font-medium transition-all"
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
            {/* Recurrence */}
            <div>
              <label className="field-label">Repeats?</label>
              <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
            </div>

            {/* Special date link — for one-off events only */}
            {recurrence === "once" && specialDates.length > 0 && (
              <div>
                <label className="field-label">Link to an anniversary?</label>
                <select
                  value={specialDateId || ""}
                  onChange={(e) => setSpecialDateId(e.target.value || null)}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] font-medium outline-none border transition-colors"
                  style={{
                    background: specialDateId ? "var(--accent-soft)" : "var(--input-bg)",
                    borderColor: specialDateId ? "var(--accent)" : "var(--input-border)",
                    color: specialDateId ? "var(--accent)" : "var(--text)",
                  }}
                >
                  <option value="">None</option>
                  {specialDates.map((sd) => (
                    <option key={sd.id} value={sd.id}>
                      {specialDateLabel(sd)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Who is this for? */}
            <div>
              <label className="field-label">Who is this for?</label>
              <div className="grid grid-cols-5 gap-1.5">
                {PEOPLE.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersonTag(personTag === p.id ? null : p.id)}
                    className="flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium border-2 transition-all"
                    style={{
                      borderColor: personTag === p.id ? "var(--accent)" : "var(--divider)",
                      background: personTag === p.id ? "var(--accent-soft)" : "var(--input-bg)",
                      color: "var(--text)",
                    }}
                  >
                    <span className="flex items-center justify-center">
                      {(() => { const PIcon = PersonIcons[p.id]; return PIcon ? <PIcon size={18} /> : p.emoji; })()}
                    </span>
                    <span className="text-[10px] leading-tight opacity-70 truncate max-w-full">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

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
                  <span className="text-[11px] self-center" style={{ color: "var(--text-very)" }}>
                    optional end
                  </span>
                </div>
              )}

              {/* End date — multi-day events (one-off only) */}
              {recurrence === "once" && (
                <div className="flex gap-2 mt-2 items-center">
                  <input
                    type="date"
                    value={endDate}
                    min={date}
                    onChange={e => setEndDate(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-[11px] self-center whitespace-nowrap" style={{ color: "var(--text-very)" }}>
                    end date · optional
                  </span>
                </div>
              )}

              {/* All-day toggle */}
              <label
                className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-[13px] font-medium transition-all"
                style={{
                  background: allDay ? "var(--today-bg)" : "var(--input-bg)",
                  border: `1.5px solid ${allDay ? "var(--today-dot)" : "var(--input-border)"}`,
                  color: allDay ? "var(--today-text)" : "var(--text)",
                }}
              >
                <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} hidden />
                <span
                  className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    background: allDay ? "var(--today-dot)" : "transparent",
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
                className="w-full rounded-xl p-3 text-[13px] resize-none outline-none"
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
          <div className="mt-4 p-3 rounded-xl text-sm text-center" style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)" }}>
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
