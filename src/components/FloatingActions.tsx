"use client";

import { motion } from "framer-motion";
import { PlusIcon, HighlightStarIcon, BellIcon } from "@/components/icons";

/**
 * The floating action bar: reminder, highlight, and new-event buttons.
 */
export default function FloatingActions({
  onNewEvent,
  onReminder,
  onHighlight,
}: {
  onNewEvent: () => void;
  onReminder: () => void;
  onHighlight: () => void;
}) {
  const chipClass =
    "flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[14px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl font-semibold shadow-md";

  const chipStyle = {
    background: "var(--card-bg)",
    border: "1.5px solid var(--card-border)",
    color: "var(--text-soft)",
  } as const;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-8 z-50 flex items-center gap-2 sm:gap-2.5">
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onReminder}
        className={chipClass}
        style={chipStyle}
      >
        <BellIcon size={15} />
        <span className="hidden sm:inline">Reminder</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onHighlight}
        className={chipClass}
        style={chipStyle}
      >
        <HighlightStarIcon size={15} />
        <span className="hidden sm:inline">Highlight</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNewEvent}
        className="btn-accent text-[13px] sm:text-[15px] px-4 sm:px-[22px] py-2.5 sm:py-[14px]"
      >
        <PlusIcon size={16} />
        <span className="hidden sm:inline">New </span>Event
      </motion.button>
    </div>
  );
}
