"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarHeart, Clock } from "lucide-react";
import { useSession } from "./SessionProvider";
import type { CreateEventPayload } from "@/lib/types";
import { EVENT_CATEGORIES } from "@/lib/categories";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedDate?: Date;
}

export default function EventModal({ isOpen, onClose, onSuccess, selectedDate }: EventModalProps) {
  const { user } = useSession();
  const currentUser = user!; // proxy ensures session exists
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selectedDate ? selectedDate.toISOString().split('T')[0] : "");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("other");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use a 2-hour default duration if no endTime is set
  const computeDefaultEndTime = (startTime: string): string => {
    if (!startTime) return "";
    const [hours, minutes] = startTime.split(":").map(Number);
    const endHours = hours + 2;
    const endMinutes = minutes;
    if (endHours >= 24) return "23:59";
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (!endTime && newTime) {
      setEndTime(computeDefaultEndTime(newTime));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

      const payload: CreateEventPayload = {
        title,
        date,
        time,
        endTime: endTime || undefined,
        notes,
        category,
        createdBy: currentUser,
      };

    try {
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error("Failed to create event");
        setIsSubmitting(false);
        return;
      }

      // Simulate network delay for cute button state
      setTimeout(() => {
        setIsSubmitting(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 800);
    } catch (err) {
      console.error("Event creation error:", err);
      setIsSubmitting(false);
    }
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
            className="fixed inset-0 bg-latte-brown/20 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="fixed inset-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-full md:max-w-md z-50 p-4 md:p-8 plush-card rounded-none md:rounded-[2.5rem] overflow-y-auto"
          >
            {/* Cat Ear Motifs */}
            <div className="absolute -top-3 -left-1 w-8 h-8 bg-white rotate-45 rounded-tl-xl border-t border-l border-latte-brown/20" />
            <div className="absolute -top-3 -right-1 w-8 h-8 bg-white rotate-45 rounded-tr-xl border-t border-r border-latte-brown/20" />

            <button onClick={onClose} className="absolute top-4 right-4 text-latte-brown hover:text-text-dark transition-colors z-10">
              <X size={20} />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6 text-text-dark">
                <CalendarHeart className="text-blush-pink" size={28} />
                <h2 className="text-2xl font-sniglet">Plan a Date</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">What are we doing?</label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-milk-white border-2 border-soft-peach rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors font-quicksand"
                    placeholder="e.g. Movie night & cuddles"
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

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">When?</label>
                    <input
                      required
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-milk-white border-2 border-soft-peach rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">
                      <Clock size={14} className="inline mr-1 text-blush-pink" />
                      Start Time
                    </label>
                    <input
                      required
                      type="time"
                      value={time}
                      onChange={e => handleTimeChange(e.target.value)}
                      className="w-full bg-milk-white border-2 border-soft-peach rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">
                      <Clock size={14} className="inline mr-1 text-husband-blue" />
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full bg-milk-white border-2 border-soft-peach rounded-2xl px-4 py-3 focus:outline-none focus:border-husband-blue transition-colors"
                      placeholder="2h later"
                    />
                    {!endTime && time && (
                      <p className="text-[10px] text-latte-brown mt-1 ml-2">Defaults to 2 hours</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">Meow Notes 🐾</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-milk-white border-2 border-soft-peach rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors resize-none h-24 font-quicksand"
                    placeholder="Don't forget to bring snacks..."
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 bg-text-dark text-milk-white font-sniglet text-lg py-4 rounded-2xl shadow-plush flex justify-center items-center gap-2"
                >
                  {isSubmitting ? "Sending..." : "Send Invite 🐾"}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
