"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { getCategoryById } from "@/lib/categories";

interface Memory {
  id: string;
  journal: string | null;
  photos: string | null;
  createdAt: string;
  event: {
    title: string;
    date: string;
    category: string | null;
  };
}

interface MemoryCardProps {
  memory: Memory;
  onEdit: (memory: Memory) => void;
  onDelete: (memory: Memory) => void;
}

export default function MemoryCard({ memory, onEdit, onDelete }: MemoryCardProps) {
  const cat = getCategoryById(memory.event.category);
  const dateStr = new Date(memory.event.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  let photos: string[] = [];
  if (memory.photos) {
    try { photos = JSON.parse(memory.photos); } catch { /* ignore */ }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="break-inside-avoid note-card overflow-hidden cursor-default relative"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showActions && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(memory); }}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(memory); }}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: "rgba(197, 48, 48, 0.7)", color: "#fff" }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {photos.length > 0 ? (
        <div className="relative">
          <img
            src={photos[photoIndex]}
            alt={memory.event.title}
            className="w-full aspect-auto object-cover cursor-zoom-in"
            onClick={() => setLightbox(photos[photoIndex])}
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.preventDefault(); setPhotoIndex((i) => (i === 0 ? photos.length - 1 : i - 1)); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setPhotoIndex((i) => (i === photos.length - 1 ? 0 : i + 1)); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
              >
                <ChevronRight size={14} />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {photos.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: i === photoIndex ? "#fff" : "rgba(255,255,255,0.5)" }} />
                ))}
              </div>
            </>
          )}
        </div>
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

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
              onClick={() => setLightbox(null)}
            >
              <X size={18} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox}
              alt="Memory"
              className="max-w-full max-h-[90vh] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
