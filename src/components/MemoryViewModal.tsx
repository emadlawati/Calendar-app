"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { getCategoryById } from "@/lib/categories";
import ReactionBar from "./ReactionBar";
import CommentThread from "./CommentThread";

interface Memory {
  id: string;
  journal: string | null;
  photos: string | null;
  createdAt: string;
  event: { title: string; date: string; category: string | null };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  memory: Memory | null;
  onEdit: (memory: Memory) => void;
  onDeleted: () => void;
}

export default function MemoryViewModal({ isOpen, onClose, memory, onEdit, onDeleted }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) { setPhotoIndex(0); setConfirmDelete(false); }
  }, [isOpen, memory?.id]);

  if (!memory) return null;

  const cat = getCategoryById(memory.event.category);
  const dateStr = new Date(memory.event.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  let photos: string[] = [];
  if (memory.photos) { try { photos = JSON.parse(memory.photos); } catch { /* ignore */ } }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await fetch(`/api/memories/${memory.id}`, { method: "DELETE", credentials: "same-origin" });
      onDeleted();
      onClose();
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(40, 25, 15, 0.45)", backdropFilter: "blur(6px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 modal-shell w-[460px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.35)", color: "#fff" }} aria-label="Close">
              <X size={18} />
            </button>

            {/* Photos */}
            {photos.length > 0 ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos[photoIndex]}
                  alt={memory.event.title}
                  className="w-full max-h-[44vh] object-cover cursor-zoom-in"
                  onClick={() => setLightbox(photos[photoIndex])}
                />
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIndex((i) => (i === 0 ? photos.length - 1 : i - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}><ChevronLeft size={16} /></button>
                    <button onClick={() => setPhotoIndex((i) => (i === photos.length - 1 ? 0 : i + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}><ChevronRight size={16} /></button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {photos.map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === photoIndex ? "#fff" : "rgba(255,255,255,0.5)" }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-28 flex items-center justify-center" style={{ background: cat.color }}>
                <span className="text-4xl">{cat.emoji}</span>
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                  style={{ background: cat.color, color: cat.textColor }}>{cat.label}</span>
                <span className="text-[11px]" style={{ color: "var(--text-very)" }}>{dateStr}</span>
              </div>

              <h2 className="text-xl mb-3" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
                {memory.event.title}
              </h2>

              {memory.journal && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text)" }}>
                  &ldquo;{memory.journal}&rdquo;
                </p>
              )}

              {/* Reactions */}
              <div className="mb-1">
                <ReactionBar targetType="memory" targetId={memory.id} />
              </div>

              {/* Comments */}
              <CommentThread targetType="memory" targetId={memory.id} defaultOpen />

              {/* Actions */}
              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={() => { onEdit(memory); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
                  style={{ background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--divider)" }}
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "var(--input-bg)", color: "#c14a33", border: "1.5px solid #c14a33", opacity: deleting ? 0.6 : 1 }}
                >
                  <Trash2 size={14} /> {confirmDelete ? "Tap to confirm" : "Delete"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Lightbox */}
          <AnimatePresence>
            {lightbox && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
                onClick={() => setLightbox(null)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lightbox} alt="Memory" className="max-w-full max-h-[90vh] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
