"use client";

import { motion } from "framer-motion";
import { getCategoryById } from "@/lib/categories";

interface Memory {
  id: string;
  journal: string | null;
  photoUrl: string | null;
  createdAt: string;
  event: {
    title: string;
    date: string;
    category: string | null;
  };
}

export default function MemoryCard({ memory }: { memory: Memory }) {
  const cat = getCategoryById(memory.event.category);
  const dateStr = new Date(memory.event.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="break-inside-avoid note-card overflow-hidden cursor-default"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      {memory.photoUrl ? (
        <img src={memory.photoUrl} alt={memory.event.title} className="w-full aspect-auto object-cover" />
      ) : (
        <div className="w-full h-32 flex items-center justify-center"
          style={{ background: cat.color }}>
          <span className="text-4xl">{cat.emoji}</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
            style={{ background: cat.color, color: cat.textColor }}>
            {cat.label}
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-very)" }}>{dateStr}</span>
        </div>

        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
          {memory.event.title}
        </h3>

        {memory.journal && (
          <p className="text-xs mt-2 leading-relaxed line-clamp-3" style={{ color: "var(--text-soft)" }}>
            &ldquo;{memory.journal}&rdquo;
          </p>
        )}
      </div>
    </motion.div>
  );
}
