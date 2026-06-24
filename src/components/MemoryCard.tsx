"use client";

import { motion } from "framer-motion";
import { Pencil, Trash2, MessageCircle } from "lucide-react";
import { getCategoryById } from "@/lib/categories";
import type { User } from "@/lib/types";

interface Memory {
  id: string;
  journal: string | null;
  photos: string | null;
  createdAt: string;
  createdBy: User;
  event: {
    title: string;
    date: string;
    category: string | null;
  };
}

interface MemoryCardProps {
  memory: Memory;
  onView: (memory: Memory) => void;
  onEdit: (memory: Memory) => void;
  onDelete: (memory: Memory) => void;
}

export default function MemoryCard({ memory, onView, onEdit, onDelete }: MemoryCardProps) {
  const cat = getCategoryById(memory.event.category);
  const dateStr = new Date(memory.event.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  let photos: string[] = [];
  if (memory.photos) {
    try { photos = JSON.parse(memory.photos); } catch { /* ignore */ }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="break-inside-avoid note-card overflow-hidden cursor-pointer relative group"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={() => onView(memory)}
    >
      {/* Hover actions */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(memory); }}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
          aria-label="Edit memory"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(memory); }}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: "rgba(197, 48, 48, 0.7)", color: "#fff" }}
          aria-label="Delete memory"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {photos.length > 0 ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[0]}
            alt={memory.event.title}
            className="w-full aspect-auto object-cover"
          />
          {photos.length > 1 && (
            <div className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
              +{photos.length - 1}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-32 flex items-center justify-center" style={{ background: cat.color }}>
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

        <div className="flex items-center gap-1.5 mt-3 text-[11px]" style={{ color: "var(--text-very)" }}>
          <MessageCircle size={12} />
          <span>Tap to view & comment</span>
        </div>
      </div>
    </motion.div>
  );
}
