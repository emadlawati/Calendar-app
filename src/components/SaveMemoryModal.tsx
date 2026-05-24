"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";

interface MemoryData {
  id?: string;
  eventId?: string;
  journal: string | null;
  photos: string | null;
  event?: { title: string; date: string; category: string | null };
}

interface PendingMemory {
  event: { id: string; title: string; category: string | null };
  daysAgo: number;
}

interface SaveMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pending: PendingMemory | null;
  editMemory?: MemoryData | null;
}

export default function SaveMemoryModal({ isOpen, onClose, onSuccess, pending, editMemory }: SaveMemoryModalProps) {
  const isEdit = !!editMemory?.id;

  const [journal, setJournal] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (editMemory) {
      setJournal(editMemory.journal || "");
      if (editMemory.photos) {
        try { setPhotos(JSON.parse(editMemory.photos)); } catch { setPhotos([]); }
      } else {
        setPhotos([]);
      }
    } else {
      setJournal("");
      setPhotos([]);
    }
  }, [editMemory]);

  const eventTitle = isEdit ? editMemory?.event?.title : pending?.event.title;
  const subtitle = isEdit ? "Edit" : pending ? `${pending.daysAgo} ${pending.daysAgo === 1 ? "day" : "days"} ago` : "";

  if (!pending && !editMemory) return null;

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const readers: Promise<string>[] = files.map((file) => {
      if (file.size > 4 * 1024 * 1024) throw new Error("Photo must be under 4MB");
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers)
      .then((results) => setPhotos((prev) => [...prev, ...results]))
      .catch(() => setError("Photo must be under 4MB"));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const url = isEdit ? `/api/memories/${editMemory!.id}` : "/api/memories";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { journal: journal || null, photos: photos.length > 0 ? photos : null }
        : { eventId: pending!.event.id, journal: journal || null, photos: photos.length > 0 ? photos : null };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save memory");
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
        onClose();
      }, 400);
    } catch {
      setError("Failed to save. Try again.");
      setIsSubmitting(false);
    }
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 modal-shell w-[440px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-6"
          >
            <button onClick={onClose} className="absolute top-4 right-4" style={{ color: "var(--text-soft)" }}>
              <X size={20} />
            </button>

            <h2 className="text-xl mb-1" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
              {isEdit ? "Edit Memory" : "Save the Memory"}
            </h2>
            {eventTitle && (
              <p className="text-xs mb-5" style={{ color: "var(--text-soft)" }}>
                {eventTitle} · {subtitle}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="field-label">Journal</label>
                <textarea
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="What made this date special?"
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="field-label">Photos</label>
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {photos.map((photo, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden">
                        <img src={photo} alt={`Memory ${i + 1}`} className="w-full h-32 object-cover" />
                        <button type="button" onClick={() => removePhoto(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--input-border)", color: "var(--text-soft)" }}>
                  <Plus size={24} strokeWidth={1.5} />
                  <span className="text-xs">{photos.length > 0 ? "Add more photos" : "Add photos"}</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} className="hidden" />
                </label>
              </div>

              {error && <p className="text-xs" style={{ color: "#c14a33" }}>{error}</p>}

              <button type="submit" disabled={isSubmitting} className="btn-send w-full justify-center">
                {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Save Memory"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
