"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCategoryById } from "@/lib/categories";

interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string | null;
  category: string | null;
  allDay: boolean;
  notes: string | null;
  memoryId: string | null;
  memoryJournal: string | null;
  memoryFirstPhoto: string | null;
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<string>("all");

  useEffect(() => {
    fetch("/api/timeline")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => {
    const ys = new Set(events.map((e) => new Date(e.date).getFullYear().toString()));
    return Array.from(ys).sort();
  }, [events]);

  const filtered = useMemo(() =>
    filterYear === "all" ? events : events.filter((e) => new Date(e.date).getFullYear().toString() === filterYear),
    [events, filterYear]
  );

  // Group by year
  const grouped = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    for (const e of filtered) {
      const y = new Date(e.date).getFullYear().toString();
      if (!map[y]) map[y] = [];
      map[y].push(e);
    }
    return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b));
  }, [filtered]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen max-w-2xl mx-auto px-4 sm:px-8 py-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--text-soft)" }}>
          <ArrowLeft size={16} />
          Calendar
        </Link>
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
          Our Story
        </h1>
      </div>

      {/* Year filter */}
      {years.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-8">
          {["all", ...years].map((y) => (
            <button
              key={y}
              onClick={() => setFilterYear(y)}
              className="chip-pill text-xs capitalize"
              style={{
                background: filterYear === y ? "var(--accent)" : "var(--chip-bg)",
                color: filterYear === y ? "var(--on-accent)" : "var(--chip-text)",
              }}
            >
              {y === "all" ? "All time" : y}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-3xl">
            ☕
          </motion.div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-soft)" }}>
          <p className="text-lg mb-2" style={{ fontFamily: "var(--font-caprasimo), cursive" }}>No dates yet</p>
          <p className="text-sm">Accept some plans and they'll appear here 🐾</p>
        </div>
      ) : (
        <div className="space-y-10">
          <AnimatePresence mode="popLayout">
            {grouped.map(([year, evts]) => (
              <div key={year}>
                {/* Year label */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1" style={{ background: "var(--divider)" }} />
                  <span
                    className="text-sm font-bold px-3 py-1 rounded-full"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                  >
                    {year}
                  </span>
                  <div className="h-px flex-1" style={{ background: "var(--divider)" }} />
                </div>

                {/* Events for this year */}
                <div className="relative">
                  {/* Vertical line */}
                  <div
                    className="absolute left-[19px] top-0 bottom-0 w-px"
                    style={{ background: "var(--divider)" }}
                  />

                  <div className="space-y-6">
                    {evts.map((evt, i) => {
                      const cat = getCategoryById(evt.category);
                      const dateLabel = new Date(evt.date).toLocaleDateString(undefined, {
                        month: "short", day: "numeric",
                      });
                      const weekday = new Date(evt.date).toLocaleDateString(undefined, { weekday: "long" });

                      return (
                        <motion.div
                          key={evt.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex gap-4"
                        >
                          {/* Dot */}
                          <div className="shrink-0 flex flex-col items-center" style={{ width: 40 }}>
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 shadow-sm border-2"
                              style={{
                                background: cat.color,
                                borderColor: "var(--card-bg)",
                                zIndex: 1,
                              }}
                            >
                              {cat.emoji}
                            </div>
                          </div>

                          {/* Card */}
                          <div
                            className="flex-1 rounded-2xl border overflow-hidden mb-1"
                            style={{
                              background: "var(--card-bg)",
                              borderColor: "var(--card-border)",
                              boxShadow: "var(--card-shadow)",
                            }}
                          >
                            {/* Memory photo */}
                            {evt.memoryFirstPhoto && (
                              <img
                                src={evt.memoryFirstPhoto}
                                alt={evt.title}
                                className="w-full h-36 object-cover"
                              />
                            )}

                            <div className="p-3.5">
                              {/* Date + category */}
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-very)" }}>
                                  {weekday}, {dateLabel}
                                  {evt.allDay ? " · All day" : ` @ ${evt.time}`}
                                </span>
                                <span
                                  className="text-[9.5px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                                  style={{ background: cat.color, color: cat.textColor }}
                                >
                                  {cat.label}
                                </span>
                              </div>

                              {/* Title */}
                              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                                {evt.title}
                              </p>

                              {/* Memory journal snippet */}
                              {evt.memoryJournal && (
                                <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: "var(--text-soft)" }}>
                                  &ldquo;{evt.memoryJournal}&rdquo;
                                </p>
                              )}

                              {/* Memory link */}
                              {evt.memoryId && (
                                <Link
                                  href="/memories"
                                  className="inline-flex items-center gap-1 mt-2 text-[10.5px] font-medium hover:opacity-70 transition-opacity"
                                  style={{ color: "var(--accent)" }}
                                >
                                  📸 View memory
                                </Link>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-center text-xs mt-10 pb-6" style={{ color: "var(--text-very)" }}>
          {filtered.length} {filtered.length === 1 ? "date" : "dates"} together ☕
        </p>
      )}
    </motion.main>
  );
}
