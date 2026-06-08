"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { useSession } from "./SessionProvider";
import type { DailyHighlight } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-filled date in "YYYY-MM-DD" format. Defaults to today. */
  initialDate?: string;
  /** If editing an existing highlight, pass it here */
  existing?: DailyHighlight | null;
}

function todayMuscat(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DailyHighlightModal({ isOpen, onClose, onSuccess, initialDate, existing }: Props) {
  const { user } = useSession();
  const [date, setDate] = useState(initialDate || todayMuscat());
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [uploadingCount, setUploadingCount] = useState(0);

  // Populate when opened or existing changes
  useEffect(() => {
    if (!isOpen) return;
    setDate(initialDate || todayMuscat());
    if (existing) {
      setNote(existing.note || "");
      try {
        setPhotos(existing.photos ? JSON.parse(existing.photos) : []);
      } catch {
        setPhotos([]);
      }
    } else {
      setNote("");
      setPhotos([]);
    }
    setError("");
  }, [isOpen, initialDate, existing]);

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError("");
    setUploadingCount(files.length);

    const uploads = files.map(async (file) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "same-origin" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url as string;
    });

    try {
      const urls = await Promise.all(uploads);
      setPhotos((prev) => [...prev, ...urls]);
    } catch {
      setError("Failed to upload photo. Please try again.");
    } finally {
      setUploadingCount(0);
      // Reset input so same file can be re-selected
      e.target.value = "";
    }
  };

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const handleClose = () => {
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      const method = existing ? "PATCH" : "POST";
      const url = existing ? `/api/highlights/${existing.id}` : "/api/highlights";
      const body = existing
        ? { note: note || null, photos: photos.length > 0 ? photos : null, createdBy: user }
        : { date, note: note || null, photos: photos.length > 0 ? photos : null, createdBy: user };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSuccess();
      handleClose();
    } catch {
      setError("Failed to save highlight. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    setDeleting(true);
    try {
      await fetch(`/api/highlights/${existing.id}`, { method: "DELETE", credentials: "same-origin" });
      onSuccess();
      handleClose();
    } catch {
      setError("Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const isEdit = !!existing;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="highlight-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(40, 25, 15, 0.45)", backdropFilter: "blur(6px)" }}
          />

          {/* Modal */}
          <motion.div
            key="highlight-modal"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 modal-shell w-[460px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-6"
          >
            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4"
              style={{ color: "var(--text-soft)" }}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">⭐</span>
              <h2
                className="text-xl"
                style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}
              >
                {isEdit ? "Edit Highlight" : "Daily Highlight"}
              </h2>
            </div>
            <p className="text-xs mb-5" style={{ color: "var(--text-soft)" }}>
              {isEdit ? formatDateDisplay(existing.date) : "Capture a moment from your day"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date picker — only shown when creating */}
              {!isEdit && (
                <div>
                  <label className="field-label">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    max={todayMuscat()}
                  />
                </div>
              )}

              {/* Note */}
              <div>
                <label className="field-label">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What made today special? ☕"
                  rows={4}
                  style={{ resize: "vertical", minHeight: 88 }}
                />
              </div>

              {/* Photos */}
              <div>
                <label className="field-label">Photos</label>
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    {photos.map((src, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Highlight ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label
                  className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--input-border)", color: "var(--text-soft)" }}
                >
                  {uploadingCount > 0 ? (
                    <span className="text-xs">Uploading {uploadingCount} photo{uploadingCount > 1 ? "s" : ""}…</span>
                  ) : (
                    <>
                      <Plus size={22} strokeWidth={1.5} />
                      <span className="text-xs">{photos.length > 0 ? "Add more photos" : "Add photos"}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoAdd}
                    disabled={uploadingCount > 0}
                    className="hidden"
                  />
                </label>
              </div>

              {error && <p className="text-xs" style={{ color: "#c14a33" }}>{error}</p>}

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-1">
                {isEdit && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: "var(--input-bg)",
                      color: "#c14a33",
                      border: "1.5px solid #c14a33",
                      opacity: deleting ? 0.6 : 1,
                    }}
                  >
                    <Trash2 size={14} />
                    {deleting ? "Deleting…" : "Delete"}
                  </motion.button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-70"
                  style={{ background: "var(--input-bg)", color: "var(--text-soft)" }}
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={submitting || uploadingCount > 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    background: submitting || uploadingCount > 0 ? "var(--input-bg)" : "var(--accent)",
                    color: submitting || uploadingCount > 0 ? "var(--text-very)" : "var(--on-accent)",
                  }}
                >
                  {submitting ? "Saving…" : isEdit ? "Save Changes" : "Save Highlight ⭐"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
