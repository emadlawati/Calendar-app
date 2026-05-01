"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Cat, Loader2 } from "lucide-react";
import { useUser } from "@/components/UserProvider";
import { useSearchParams } from "next/navigation";
import type { CalendarEvent } from "@/lib/types";

function AdjustEventForm() {
  const { currentUser } = useUser();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) {
      setError("No event ID provided");
      setLoading(false);
      return;
    }

    fetch(`/api/events/${eventId}`)
      .then(res => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then(data => {
        setEvent(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
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
          user: currentUser,
          eventId: eventId
        })
      });

      if (!res.ok) {
        console.error("Failed to propose adjustment");
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
        className="w-full max-w-sm plush-card p-6 relative overflow-hidden"
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
                <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">New Date</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white border-2 border-latte-brown/20 rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors font-quicksand"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">New Time</label>
                <input
                  required
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-white border-2 border-latte-brown/20 rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors font-quicksand"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-text-dark text-milk-white font-sniglet text-lg py-4 rounded-2xl shadow-plush flex justify-center items-center gap-2"
              >
                {isSubmitting ? "Sending..." : "Propose Time 🐾"}
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
