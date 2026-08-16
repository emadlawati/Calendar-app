"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  CalendarClockIcon,
  CatIcon,
  LoaderIcon,
  PawIcon,
  SendIcon,
  CategoryIcons,
} from "@/components/icons";
import Skeleton from "@/components/Skeleton";
import { EVENT_CATEGORIES } from "@/lib/categories";
import type { CalendarEvent } from "@/lib/types";

function AdjustEventForm() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("other");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(!!eventId);
  const [fetchError, setFetchError] = useState<string>("");
  const noIdError = eventId ? null : "No event ID provided";
  const error = noIdError || fetchError || null;

  useEffect(() => {
    if (!eventId) return;

    fetch(`/api/events/${eventId}`, { credentials: "same-origin" })
      .then(res => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then(data => {
        setEvent(data);
        setTitle(data.title || "");
        setDate(data.date ? data.date.split("T")[0] : "");
        setEndDate(data.endDate ? data.endDate.split("T")[0] : "");
        setTime(data.time || "");
        setEndTime(data.endTime || "");
        setNotes(data.notes || "");
        setCategory(data.category || "other");
        setLoading(false);
      })
      .catch(err => {
        setFetchError(err.message);
        setLoading(false);
      });
  }, [eventId]);

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/events/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "same-origin",
        body: JSON.stringify({
          action: 'adjust',
          date,
          endDate: endDate && endDate !== date ? endDate : null,
          time,
          title,
          notes,
          endTime: endTime || null,
          category,
          eventId: eventId
        })
      });

      if (!res.ok) {
        setSubmitError(true);
        setIsSubmitting(false);
        return;
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setSuccess(true);
      }, 800);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-md space-y-4" aria-hidden="true">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-3xl border p-8 text-center"
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
        >
          <CatIcon size={44} style={{ color: "var(--text-very)", margin: "0 auto 1rem" }} />
          <h1 className="heading-font text-xl mb-2" style={{ color: "var(--accent)" }}>Oops!</h1>
          <p className="text-sm" style={{ color: "var(--text-soft)" }}>
            Could not find this event. It may have been deleted.
          </p>
        </motion.div>
      </main>
    );
  }

  const originalDate = new Date(event.date).toLocaleDateString()
    + (event.endDate ? ` → ${new Date(event.endDate).toLocaleDateString()}` : "");
  const proposedBy = event.createdBy;

  return (
    <main className="min-h-screen p-4 flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-3xl border p-6 md:p-8 relative overflow-hidden"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
      >
        <div className="flex items-center gap-2.5 mb-4" style={{ color: "var(--text)" }}>
          <CalendarClockIcon size={24} style={{ color: "var(--accent)" }} />
          <h1 className="heading-font text-xl" style={{ color: "var(--accent)" }}>Propose New Time</h1>
        </div>

        <div className="p-4 rounded-2xl mb-6 border" style={{ background: "var(--input-bg)", borderColor: "var(--divider)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-soft)" }}>Original plan from {proposedBy}:</p>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{event.title}</p>
          <p className="text-sm" style={{ color: "var(--text-soft)" }}>{originalDate} @ {event.time}</p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <PawIcon size={40} style={{ color: "var(--accent)", margin: "0 auto 1rem" }} />
            <h2 className="heading-font text-xl mb-2" style={{ color: "var(--accent)" }}>Meow! New time sent.</h2>
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>Waiting for their purr-val.</p>
          </motion.div>
        ) : (
          <form onSubmit={handlePropose} className="space-y-4">
            <div>
              <label className="field-label">Event Title</label>
              <input
                required
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={event.title}
              />
            </div>

            <div>
              <label className="field-label">Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {EVENT_CATEGORIES.map((cat) => {
                  const Icon = CategoryIcons[cat.id];
                  const selected = category === cat.id;
                  return (
                    <motion.button
                      key={cat.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCategory(cat.id)}
                      className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all border-2"
                      style={{
                        borderColor: selected ? cat.dotColor : "transparent",
                        background: selected ? cat.color : "var(--input-bg)",
                        color: selected ? cat.textColor : "var(--text-soft)",
                      }}
                    >
                      <Icon size={16} />
                      <span className="text-[10px] leading-tight">{cat.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="field-label">New Date</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="field-label">End Date <span className="opacity-50 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={endDate}
                  min={date}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="field-label">New Start Time</label>
                <input
                  required
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="field-label">New End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  placeholder={event.endTime || undefined}
                />
              </div>
            </div>

            <div>
              <label className="field-label">Meow Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={event.notes || "Any additional thoughts..."}
                className="resize-none h-20"
              />
            </div>

            {submitError && (
              <p className="text-sm text-center rounded-xl py-2" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
                Something went wrong. Please try again.
              </p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSubmitting}
              className="btn-send w-full justify-center text-base py-3.5"
            >
              <SendIcon size={16} />
              {isSubmitting ? "Sending..." : "Propose Changes"}
            </motion.button>
          </form>
        )}
      </motion.div>
    </main>
  );
}

export default function AdjustEventPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <LoaderIcon size={28} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    }>
      <AdjustEventForm />
    </Suspense>
  );
}
