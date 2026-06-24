"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TargetIcon, ArchiveIcon } from "@/components/icons";
import { getCategoryById } from "@/lib/categories";
import type { CalendarEvent, SpecialDateWithCountdown } from "@/lib/types";
import SpecialDateCarousel from "./SpecialDateCarousel";

const TZ = "Asia/Muscat";

function getGulfDate(dateStr: string): Date {
  return new Date(new Date(dateStr).toLocaleDateString("en-CA", { timeZone: TZ }));
}

function getGulfToday(): Date {
  return new Date(new Date().toLocaleDateString("en-CA", { timeZone: TZ }));
}

interface CountdownBannerProps {
  events: CalendarEvent[];
  onOpenBucket: () => void;
  onToggleArchive: () => void;
  showArchived: boolean;
  specialDates?: SpecialDateWithCountdown[];
  onDeleteSpecialDate?: (id: string) => void;
}

export default function CountdownBanner({
  events,
  onOpenBucket,
  onToggleArchive,
  showArchived,
  specialDates = [],
  onDeleteSpecialDate,
}: CountdownBannerProps) {
  const { nextEvent, daysLeft, isOngoing } = useMemo(() => {
    const today = getGulfToday();

    const upcoming = events
      .filter((e) => {
        if (e.archived) return false;
        // Keep events whose span hasn't finished yet (endDate for multi-day)
        const spanEnd = getGulfDate(e.endDate || e.date);
        return spanEnd >= today;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (upcoming.length > 0) {
      const next = upcoming[0];
      const eventDate = getGulfDate(next.date);
      // Multi-day event already started — it's happening now
      if (eventDate <= today && next.endDate) {
        return { nextEvent: next, daysLeft: 0, isOngoing: true };
      }
      const diffMs = eventDate.getTime() - today.getTime();
      return { nextEvent: next, daysLeft: Math.ceil(diffMs / (1000 * 60 * 60 * 24)), isOngoing: false };
    }
    return { nextEvent: null, daysLeft: null, isOngoing: false };
  }, [events]);

  const category = nextEvent ? getCategoryById(nextEvent.category) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-2.5 sm:mx-8 rounded-2xl sm:rounded-3xl flex flex-col gap-3 sm:gap-5 px-3.5 sm:px-[26px] py-3.5 sm:py-5 relative overflow-hidden shadow-xl"
      style={{
        background: "linear-gradient(135deg, #6b3a1f 0%, #8a4a22 100%)",
        boxShadow: "0 14px 30px -14px rgba(60, 30, 10, 0.5)",
        color: "#fce8c8",
      }}
    >
      {/* Decorative steam swirl */}
      <svg
        className="absolute top-[-4px] right-6 opacity-[0.15] pointer-events-none"
        width="120" height="80" viewBox="0 0 120 80" fill="none" stroke="#fce8c8" strokeWidth="2" strokeLinecap="round"
      >
        <path d="M10 70 Q30 50 50 70 T90 70" />
        <path d="M30 55 Q50 35 70 55 T110 55" opacity="0.6" />
        <path d="M0 40 Q20 20 40 40 T80 40" opacity="0.5" />
      </svg>

      {/* Top row: event info + action tiles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">

      {/* Left: event info */}
      <div className="flex items-center gap-5 relative z-10 flex-1 min-w-0">
        {nextEvent && daysLeft !== null ? (
          <>
            {/* Day counter square */}
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-[14px] sm:rounded-[18px] flex flex-col items-center justify-center border shrink-0"
              style={{
                background: "rgba(252, 232, 200, 0.15)",
                borderColor: "rgba(252, 232, 200, 0.3)",
              }}
            >
              <span
                className="text-[20px] sm:text-[26px] leading-none"
                style={{ fontFamily: "var(--font-caprasimo), cursive" }}
              >
                {isOngoing ? "✈️" : daysLeft === 0 ? "!" : daysLeft}
              </span>
              <span className="text-[8px] sm:text-[9.5px] tracking-[0.08em] opacity-75">
                {isOngoing ? "NOW" : daysLeft === 0 ? "TODAY" : daysLeft === 1 ? "DAY" : "DAYS"}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11.5px] uppercase tracking-wider opacity-75 mb-0.5 sm:mb-1">
                {isOngoing ? "Happening now!" : daysLeft === 0 ? "It's happening today!" : daysLeft === 1 ? "Tomorrow" : "Up next together"}
              </p>
              <p
                className="text-[17px] sm:text-[22px] leading-tight truncate"
                style={{ fontFamily: "var(--font-caprasimo), cursive" }}
              >
                {nextEvent.title}
              </p>
              <p className="text-[11px] sm:text-[12.5px] opacity-80 mt-0.5">
                {new Date(nextEvent.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                {nextEvent.endDate && ` → ${new Date(nextEvent.endDate).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`}
                {nextEvent.allDay ? " · All day" : ` @ ${nextEvent.time}`}
                {category && <span className="hidden sm:inline"> · {category.emoji} {category.label}</span>}
              </p>
            </div>
          </>
        ) : (
          <div>
            <p
              className="text-[22px]"
              style={{ fontFamily: "var(--font-caprasimo), cursive" }}
            >
              No plans yet
            </p>
            <p className="text-[12.5px] opacity-75 mt-0.5">Time to brew a new date? ☕</p>
          </div>
        )}
      </div>

      {/* Right: action tiles */}
      <div className="flex gap-2 sm:gap-3 relative z-10 shrink-0">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onOpenBucket}
          className="w-[52px] sm:w-16 flex flex-col items-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl sm:rounded-[14px] border transition-all"
          style={{
            background: "rgba(252, 232, 200, 0.12)",
            borderColor: "rgba(252, 232, 200, 0.2)",
          }}
        >
          <TargetIcon size={16} />
          <span className="text-[10px] sm:text-[11px] opacity-90">Bucket</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onToggleArchive}
          className="w-[52px] sm:w-16 flex flex-col items-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl sm:rounded-[14px] border transition-all"
          style={{
            background: showArchived ? "rgba(252, 232, 200, 0.3)" : "rgba(252, 232, 200, 0.12)",
            borderColor: showArchived ? "rgba(252, 232, 200, 0.4)" : "rgba(252, 232, 200, 0.2)",
          }}
        >
          <ArchiveIcon size={16} />
          <span className="text-[10px] sm:text-[11px] opacity-90">{showArchived ? "All" : "Archive"}</span>
        </motion.button>
      </div>

      </div>{/* end top row */}

      {/* Special dates row — full width below main row */}
      <div className="w-full relative z-10">
        <SpecialDateCarousel
          dates={specialDates.map(d => ({ id: d.id, title: d.title, emoji: d.emoji, daysLeft: d.daysLeft, type: d.type }))}
          onDelete={onDeleteSpecialDate}
        />
      </div>
    </motion.div>
  );
}
