"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/Modal";
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, TrashIcon, HighlightStarIcon } from "@/components/icons";
import { getDisplayName } from "@/lib/names";
import ReactionBar from "./ReactionBar";
import CommentThread from "./CommentThread";
import type { DailyHighlight } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  highlight: DailyHighlight | null;
  onEdit: (highlight: DailyHighlight) => void;
  onDeleted: () => void;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function HighlightViewModal({ isOpen, onClose, highlight, onEdit, onDeleted }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) { setPhotoIndex(0); setConfirmDelete(false); }
  }, [isOpen, highlight?.id]);

  if (!highlight) return null;

  let photos: string[] = [];
  if (highlight.photos) { try { photos = JSON.parse(highlight.photos); } catch { /* ignore */ } }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await fetch(`/api/highlights/${highlight.id}`, { method: "DELETE", credentials: "same-origin" });
      onDeleted();
      onClose();
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        width="md"
        flush
        closeVariant={photos.length > 0 ? "onPhoto" : "default"}
        ariaLabel="Highlight details"
      >
        {/* Photos */}
        {photos.length > 0 && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[photoIndex]}
              alt="Highlight"
              className="w-full max-h-[44vh] object-cover cursor-zoom-in"
              onClick={() => setLightbox(photos[photoIndex])}
            />
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIndex((i) => (i === 0 ? photos.length - 1 : i - 1))}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}><ChevronLeftIcon size={16} /></button>
                <button onClick={() => setPhotoIndex((i) => (i === photos.length - 1 ? 0 : i + 1))}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}><ChevronRightIcon size={16} /></button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === photoIndex ? "#fff" : "rgba(255,255,255,0.5)" }} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <HighlightStarIcon size={20} style={{ color: "var(--cat-occasions-dot)" }} />
            <h2 className="heading-font text-lg" style={{ color: "var(--accent)" }}>
              {formatDate(highlight.date)}
            </h2>
          </div>
          <p className="text-[11px] mb-3" style={{ color: "var(--text-very)" }}>
            Captured by {getDisplayName(highlight.createdBy)}
          </p>

          {highlight.note && (
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text)" }}>
              {highlight.note}
            </p>
          )}

          {/* Reactions */}
          <div className="mb-1">
            <ReactionBar targetType="highlight" targetId={highlight.id} ownerId={highlight.createdBy} />
          </div>

          {/* Comments */}
          <CommentThread targetType="highlight" targetId={highlight.id} ownerId={highlight.createdBy} defaultOpen />

          {/* Actions */}
          <div className="flex gap-2.5 mt-5">
            <button
              onClick={() => { onEdit(highlight); onClose(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
              style={{ background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--divider)" }}
            >
              <PencilIcon size={14} /> Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "var(--input-bg)", color: "var(--danger)", border: "1.5px solid var(--danger)", opacity: deleting ? 0.6 : 1 }}
            >
              <TrashIcon size={14} /> {confirmDelete ? "Tap to confirm" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
            onClick={() => setLightbox(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="Highlight" className="max-w-full max-h-[90vh] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
