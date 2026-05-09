"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { getCategoryById } from "@/lib/categories";
import type { CalendarEvent } from "@/lib/types";

interface CountdownBannerProps {
  events: CalendarEvent[];
}

export default function CountdownBanner({ events }: CountdownBannerProps) {
  const { nextEvent, daysLeft } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = events
      .filter((e) => {
        if (e.archived) return false;
        const eventDate = new Date(new Date(e.date).toISOString().split("T")[0]);
        return eventDate >= now;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (upcoming.length > 0) {
      const next = upcoming[0];
      const eventDate = new Date(new Date(next.date).toISOString().split("T")[0]);
      const diffMs = eventDate.getTime() - now.getTime();
      return {
        nextEvent: next,
        daysLeft: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
      };
    }

    return { nextEvent: null, daysLeft: null };
  }, [events]);

  if (!nextEvent || daysLeft === null) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-3 px-4 rounded-2xl bg-white/50 border border-latte-brown/10 text-text-dark/50 text-sm font-quicksand"
      >
        No plans yet... time for a date? 🧶
      </motion.div>
    );
  }

  const category = getCategoryById(nextEvent.category);
  const isToday = daysLeft === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-3 px-4 rounded-2xl bg-white/60 border border-latte-brown/10 shadow-sm"
    >
      <div className="flex items-center justify-center gap-2 text-text-dark">
        <Clock size={16} className="text-blush-pink" />
        <span className="text-sm font-bold font-quicksand">
          {isToday ? (
            <>
              <span className="text-lg mr-1">🎉</span>
              Today!{" "}
            </>
          ) : daysLeft === 1 ? (
            <>
              <span className="text-lg mr-1">🐾</span>
              Tomorrow!{" "}
            </>
          ) : (
            <>
              <span className="text-lg mr-1">🐾</span>
              {daysLeft} days until{" "}
            </>
          )}
          <span className="text-blush-pink">
            {category.emoji} {nextEvent.title}
          </span>
        </span>
      </div>
    </motion.div>
  );
}
