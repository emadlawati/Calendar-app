"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarHeart, Clock, Sun } from "lucide-react";
import { useSession } from "./SessionProvider";
import type { CreateEventPayload } from "@/lib/types";
import { EVENT_CATEGORIES, getCategoryById } from "@/lib/categories";
import type { BucketItem } from "@/lib/types";

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
  const [allDay, setAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showBucketPicker, setShowBucketPicker] = useState(false);
  const [bucketItems, setBucketItems] = useState<BucketItem[]>([]);
  const [bucketLoading, setBucketLoading] = useState(false);

  const loadBucketItems = async () => {
    setBucketLoading(true);
    try {
      const res = await fetch("/api/bucket");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBucketItems(data.filter((i: BucketItem) => !i.completed));
      }
    } catch { /* ignore */ }
    setBucketLoading(false);
    setShowBucketPicker(true);
  };

  const pickFromBucket = (item: BucketItem) => {
    setTitle(item.title);
    setCategory(item.category);
    if (item.notes) setNotes(item.notes);
    setShowBucketPicker(false);
  };

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
      }, 800);
    } catch {
      setError("Network error. Please check your connection.");
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

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadBucketItems}
                  className="w-full text-xs font-bold text-latte-brown hover:text-blush-pink transition-colors py-1 flex items-center justify-center gap-1"
                >
                  <span>🎯</span> Pick from Bucket List
                </motion.button>

                {showBucketPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-milk-white/50 border border-soft-peach rounded-2xl p-3 space-y-1 max-h-40 overflow-y-auto"
                  >
                    {bucketLoading ? (
                      <p className="text-xs text-center text-text-dark/40 py-2">Loading...</p>
                    ) : bucketItems.length === 0 ? (
                      <p className="text-xs text-center text-text-dark/40 py-2">
                        Bucket list empty! Add ideas first.
                      </p>
                    ) : (
                      bucketItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => pickFromBucket(item)}
                          className="w-full text-left px-3 py-1.5 rounded-xl text-sm hover:bg-white transition-colors flex items-center gap-2"
                        >
                          <span>{getCategoryById(item.category).emoji}</span>
                          <span className="truncate">{item.title}</span>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}

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

                <motion.button
                  type="button"
                  onClick={() => {
                    setAllDay(!allDay);
                    if (!allDay) { setTime("00:00"); setEndTime("23:59"); }
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold transition-all border-2 ${
                    allDay
                      ? "bg-amber-50 border-amber-300 text-amber-700"
                      : "bg-white/50 border-latte-brown/10 text-latte-brown hover:border-amber-200"
                  }`}
                >
                  <Sun size={16} />
                  All Day
                </motion.button>

                {!allDay && (
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
                )}

                <div>
                  <label className="block text-sm font-bold mb-1 ml-2 text-text-dark/80">Meow Notes 🐾</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-milk-white border-2 border-soft-peach rounded-2xl px-4 py-3 focus:outline-none focus:border-blush-pink transition-colors resize-none h-24 font-quicksand"
                    placeholder="Don't forget to bring snacks..."
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl p-3 text-center"
                  >
                    {error}
                  </motion.div>
                )}

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
