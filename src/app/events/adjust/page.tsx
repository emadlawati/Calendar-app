"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Cat, Loader2 } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useSearchParams } from "next/navigation";
import { EVENT_CATEGORIES } from "@/lib/categories";
import type { CalendarEvent } from "@/lib/types";

function AdjustEventForm() {
  const { user: sessionUser } = useSession();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");
  const urlUser = searchParams.get("user"); // from email link
  const currentUser = (urlUser || sessionUser) as "Wife" | "Husband";
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
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

    fetch(`/api/events/${eventId}`)
      .then(res => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then(data => {
        setEvent(data);
        setTitle(data.title || "");
        setDate(data.date ? data.date.split("T")[0] : "");
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
        body: JSON.stringify({
          action: 'adjust',
          date,
          time,
          title,
          notes,
          endTime: endTime || null,
          category,
          user: currentUser,
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
      <main className="min-h-screen p-4 flex items-center justify-center bg-milk-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="animate-spin text-blush-pink mx-auto" size={40} />
          <p className="mt-4 text-text-dark font-sniglet">Loading plan...</p>
        </motion.div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center bg-milk-white">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm plush-card p-6 text-center"
        >
          <Cat size={48} className="mx-auto text-latte-brown/30 mb-4" />
          <h1 className="text-xl font-sniglet text-text-dark mb-2">Oops!</h1>
          <p className="text-text-dark/70">Could not find this event. It may have been deleted.</p>
        </motion.div>
      </main>
    );
  }

  const originalDate = new Date(event.date).toLocaleDateString();
  const proposedBy = event.createdBy;

  return (
    <main className="min-h-screen p-4 flex items-center justify-center bg-milk-white">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm md:max-w-md plush-card p-6 md:p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Cat size={120} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4 text-text-dark">
            <CalendarClock className="text-blush-pink" size={24} />
            <h1 className="text-xl font-sniglet">Propose New Time</h1>
          </div>

          <div className="bg-soft-peach/30 p-4 rounded-xl mb-6 border border-soft-peach">
            <p className="text-sm text-text-dark/80 mb-1">Original Plan from {proposedBy}:</p>
            <p className="font-bold text-text-dark font-sniglet">{event.title}</p>
            <p className="text-sm text-text-dark">{originalDate} @ {event.time}</p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="text-4xl mb-4">🐾</div>
              <h2 className="font-sniglet text-xl text-text-dark mb-2">Meow! New time sent.</h2>
              <p className="text-text-dark/70 text-sm">Waiting for their purr-val.</p>
            </motion.div>
          ) : (
            <form onSubmit={handlePropose} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">Event Title</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={event.title}
                  className="w-full bg-white border-2 border-latte-brown/20 rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors font-quicksand"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 ml-2 text-text-dark/80">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_CATEGORIES.map((cat) => (
                    <motion.button
                      key={cat.id}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-bold transition-all border-2 ${
                        category === cat.id
                          ? "border-blush-pink bg-blush-pink/30 shadow-sm"
                          : "border-transparent bg-white/50 hover:bg-white/80"
                      }`}
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="text-[10px] leading-tight text-text-dark/70">{cat.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">New Date</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white border-2 border-latte-brown/20 rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors font-quicksand"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">New Start Time</label>
                  <input
                    required
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full bg-white border-2 border-latte-brown/20 rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors font-quicksand"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">New End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    placeholder={event.endTime || undefined}
                    className="w-full bg-white border-2 border-latte-brown/20 rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors font-quicksand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">Meow Notes 🐾</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={event.notes || "Any additional thoughts..."}
                  className="w-full bg-white border-2 border-latte-brown/20 rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors font-quicksand resize-none h-20"
                />
              </div>

              {submitError && (
                <p className="text-sm text-center rounded-xl py-2" style={{ color: "#c14a33", background: "rgba(193,74,51,0.08)" }}>
                  Something went wrong. Please try again.
                </p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-text-dark text-milk-white font-sniglet text-lg py-4 rounded-2xl shadow-plush flex justify-center items-center gap-2"
              >
                {isSubmitting ? "Sending..." : "Propose Changes 🐾"}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  );
}

export default function AdjustEventPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading... 🐾</div>}>
      <AdjustEventForm />
    </Suspense>
  );
}
