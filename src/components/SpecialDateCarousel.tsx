"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";

interface SpecialDate {
  id: string;
  title: string;
  emoji: string | null;
  daysLeft: number;
  type: "annual" | "one-time";
}

interface SpecialDateCarouselProps {
  dates: SpecialDate[];
  onDelete?: (id: string) => void;
}

export default function SpecialDateCarousel({ dates, onDelete }: SpecialDateCarouselProps) {
  const [expanded, setExpanded] = useState(false);

  const sorted = [...dates]
    .filter((d) => d.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (sorted.length === 0) return null;

  const visible = expanded ? sorted : sorted.slice(0, 2);
  const hasMore = sorted.length > 2;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <AnimatePresence mode="popLayout">
          {visible.map((d) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium group/chip"
              style={{
                background: d.daysLeft === 0 ? "rgba(252, 232, 200, 0.25)" : "rgba(252, 232, 200, 0.12)",
                borderColor: d.daysLeft === 0 ? "rgba(252, 232, 200, 0.5)" : "rgba(252, 232, 200, 0.2)",
              }}
            >
              <span className="text-sm">{d.emoji}</span>
              <span className="truncate max-w-[140px]">
                {d.title}
              </span>
              <span className="opacity-75 shrink-0">
                {d.daysLeft === 0 ? "TODAY 🎉" : `in ${d.daysLeft}d`}
              </span>
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(d.id); }}
                  className="opacity-0 group-hover/chip:opacity-100 transition-opacity ml-0.5 shrink-0"
                  style={{ color: "rgba(252,232,200,0.7)" }}
                  aria-label="Remove"
                >
                  <X size={11} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {hasMore && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-colors"
            style={{
              background: "rgba(252, 232, 200, 0.12)",
              borderColor: "rgba(252, 232, 200, 0.2)",
            }}
            aria-label={expanded ? "Show fewer" : `Show ${sorted.length - 2} more`}
          >
            {expanded ? (
              <>
                <span className="opacity-75">Less</span>
                <ChevronDown size={12} className="rotate-180" />
              </>
            ) : (
              <>
                <span className="opacity-75">+{sorted.length - 2}</span>
                <ChevronDown size={12} />
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}
