"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import MemoryCard from "@/components/MemoryCard";
import MemoryViewModal from "@/components/MemoryViewModal";
import HighlightViewModal from "@/components/HighlightViewModal";
import SaveMemoryModal from "@/components/SaveMemoryModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import DailyHighlightModal from "@/components/DailyHighlightModal";
import { ArrowLeft, Plus, X } from "lucide-react";
import { getCategoryById } from "@/lib/categories";
import type { CalendarEvent, PendingMemory, DailyHighlight, User } from "@/lib/types";

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

interface MemoryStats {
  totalMemories: number;
  categoryCounts: { category: string; count: number; emoji: string }[];
  thisYearCount: number;
}

export default function MemoriesPage() {
  const [activeTab, setActiveTab] = useState<"memories" | "highlights">("memories");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [editMemory, setEditMemory] = useState<Memory | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Memory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New memory flow
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerEvents, setPickerEvents] = useState<CalendarEvent[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [newMemoryPending, setNewMemoryPending] = useState<PendingMemory | null>(null);
  const [isNewMemoryModalOpen, setIsNewMemoryModalOpen] = useState(false);

  // Highlights
  const [highlights, setHighlights] = useState<DailyHighlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [isHighlightModalOpen, setIsHighlightModalOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<DailyHighlight | null>(null);

  // Read-only view modals
  const [viewMemory, setViewMemory] = useState<Memory | null>(null);
  const [viewHighlight, setViewHighlight] = useState<DailyHighlight | null>(null);

  const fetchMemories = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCategory !== "all") params.set("category", filterCategory);

    fetch(`/api/memories?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMemories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/memories/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [filterCategory]);

  const fetchHighlights = () => {
    setHighlightsLoading(true);
    fetch("/api/highlights")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setHighlights(data); })
      .catch(() => {})
      .finally(() => setHighlightsLoading(false));
  };

  useEffect(() => {
    fetchHighlights();
  }, []);

  const openPicker = async () => {
    setIsPickerOpen(true);
    setPickerLoading(true);
    try {
      const res = await fetch("/api/events");
      const data: CalendarEvent[] = await res.json();
      const now = new Date();
      const eligible = data.filter((e) => {
        if (e.status !== "accepted" || e.archived) return false;
        if (e.memoryId) return false;
        const eventDate = new Date((e.date as string).split("T")[0] + "T00:00:00+04:00");
        return eventDate <= now;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPickerEvents(eligible);
    } catch { /* ignore */ }
    setPickerLoading(false);
  };

  const handlePickEvent = (event: CalendarEvent) => {
    const daysAgo = Math.floor((Date.now() - new Date((event.date as string).split("T")[0]).getTime()) / (1000 * 60 * 60 * 24));
    setNewMemoryPending({ event: { id: event.id, title: event.title, category: event.category ?? null }, daysAgo });
    setIsPickerOpen(false);
    setIsNewMemoryModalOpen(true);
  };

  const handleEdit = (memory: Memory) => {
    setEditMemory(memory);
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/memories/${deleteTarget.id}`, { method: "DELETE" });
      setMemories((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      fetch("/api/memories/stats").then((r) => r.json()).then(setStats);
    } catch { /* ignore */ }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const categories = stats?.categoryCounts || [];

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen max-w-4xl mx-auto px-4 sm:px-8 py-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--text-soft)" }}>
            <ArrowLeft size={16} />
            Calendar
          </Link>
          <h1 className="text-2xl" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
            {activeTab === "memories" ? "Memory Wall" : "Daily Highlights"}
          </h1>
        </div>
        {activeTab === "memories" ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openPicker}
            className="flex items-center gap-1.5 chip-pill font-semibold text-xs"
          >
            <Plus size={13} />
            New Memory
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setEditingHighlight(null); setIsHighlightModalOpen(true); }}
            className="flex items-center gap-1.5 chip-pill font-semibold text-xs"
          >
            <Plus size={13} />
            New Highlight
          </motion.button>
        )}
      </div>

      {/* Tab switcher */}
      <div
        className="flex gap-1 p-1 rounded-2xl mb-6 w-fit"
        style={{ background: "var(--chip-bg)", border: "1px solid var(--chip-border)" }}
      >
        <button
          onClick={() => setActiveTab("memories")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: activeTab === "memories" ? "var(--accent)" : "transparent",
            color: activeTab === "memories" ? "var(--on-accent)" : "var(--text-soft)",
          }}
        >
          📸 Memories
        </button>
        <button
          onClick={() => setActiveTab("highlights")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: activeTab === "highlights" ? "var(--accent)" : "transparent",
            color: activeTab === "highlights" ? "var(--on-accent)" : "var(--text-soft)",
          }}
        >
          ⭐ Highlights
          {highlights.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                background: activeTab === "highlights" ? "rgba(255,255,255,0.25)" : "var(--accent)",
                color: activeTab === "highlights" ? "var(--on-accent)" : "var(--on-accent)",
              }}
            >
              {highlights.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "memories" ? (
        <>
          {/* Stats Bar */}
          {stats && stats.totalMemories > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="chip-pill flex items-center gap-1.5">
                <span className="text-xs">📸 {stats.totalMemories} memories</span>
              </div>
              {stats.thisYearCount > 0 && (
                <div className="chip-pill">
                  <span className="text-[11px]">{stats.thisYearCount} this year</span>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => setFilterCategory("all")}
              className="chip-pill text-xs"
              style={{ background: filterCategory === "all" ? "var(--accent)" : "var(--chip-bg)", color: filterCategory === "all" ? "var(--on-accent)" : "var(--chip-text)" }}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                onClick={() => setFilterCategory(c.category)}
                className="chip-pill text-xs"
                style={{ background: filterCategory === c.category ? "var(--accent)" : "var(--chip-bg)", color: filterCategory === c.category ? "var(--on-accent)" : "var(--chip-text)" }}
              >
                {c.emoji} {c.count}
              </button>
            ))}
          </div>

          {/* Masonry Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-3xl">
                ☕
              </motion.div>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-20" style={{ color: "var(--text-soft)" }}>
              <p className="text-lg mb-2" style={{ fontFamily: "var(--font-caprasimo), cursive" }}>No memories yet</p>
              <p className="text-sm">Save your first memory and it&apos;ll appear here 🐾</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
              {memories.map((m) => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  onView={(mem) => setViewMemory(mem)}
                  onEdit={handleEdit}
                  onDelete={(mem) => setDeleteTarget(mem)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── Highlights tab ── */
        <>
          {highlightsLoading ? (
            <div className="flex items-center justify-center py-20">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-3xl">
                ☕
              </motion.div>
            </div>
          ) : highlights.length === 0 ? (
            <div className="text-center py-20" style={{ color: "var(--text-soft)" }}>
              <p className="text-lg mb-2" style={{ fontFamily: "var(--font-caprasimo), cursive" }}>No highlights yet</p>
              <p className="text-sm">Capture a moment from any day — no event needed ⭐</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
              {highlights.map((h) => {
                const photoParsed: string[] = (() => { try { return h.photos ? JSON.parse(h.photos) : []; } catch { return []; } })();
                const [y, m2, d2] = h.date.split("-").map(Number);
                const displayDate = new Date(y, m2 - 1, d2).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
                return (
                  <motion.div
                    key={h.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="break-inside-avoid rounded-2xl border overflow-hidden cursor-pointer group"
                    style={{
                      background: "var(--card-bg)",
                      borderColor: "var(--card-border)",
                      boxShadow: "var(--card-shadow)",
                    }}
                    onClick={() => setViewHighlight(h)}
                  >
                    {/* First photo */}
                    {photoParsed.length > 0 && (
                      <div className="relative overflow-hidden aspect-[4/3]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoParsed[0]}
                          alt="Highlight photo"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {photoParsed.length > 1 && (
                          <div
                            className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                          >
                            +{photoParsed.length - 1}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-base">⭐</span>
                        <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{displayDate}</p>
                      </div>
                      {h.note && (
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                          {h.note.length > 180 ? h.note.slice(0, 180) + "…" : h.note}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Event Picker Sheet */}
      <AnimatePresence>
        {isPickerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPickerOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(40, 25, 15, 0.45)", backdropFilter: "blur(6px)" }}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 modal-shell w-[440px] max-w-[95vw] max-h-[75vh] flex flex-col p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
                  Pick an event
                </h2>
                <button onClick={() => setIsPickerOpen(false)} style={{ color: "var(--text-soft)" }}>
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--text-soft)" }}>
                Choose a past event to save a memory for
              </p>

              <div className="flex-1 overflow-y-auto space-y-2">
                {pickerLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-2xl">
                      ☕
                    </motion.div>
                  </div>
                ) : pickerEvents.length === 0 ? (
                  <p className="text-center text-sm py-8" style={{ color: "var(--text-soft)" }}>
                    No past events without memories 🎉
                  </p>
                ) : (
                  pickerEvents.map((event) => {
                    const cat = getCategoryById(event.category);
                    return (
                      <motion.button
                        key={event.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handlePickEvent(event)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors"
                        style={{
                          background: "var(--input-bg)",
                          borderColor: "var(--divider)",
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                          style={{ background: cat.color }}
                        >
                          {cat.emoji}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                            {event.title}
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--text-soft)" }}>
                            {new Date(event.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SaveMemoryModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditMemory(null); }}
        onSuccess={() => { fetchMemories(); fetch("/api/memories/stats").then((r) => r.json()).then(setStats); setEditMemory(null); }}
        pending={null}
        editMemory={editMemory ? {
          id: editMemory.id,
          journal: editMemory.journal,
          photos: editMemory.photos,
          event: editMemory.event,
        } : null}
      />

      <SaveMemoryModal
        isOpen={isNewMemoryModalOpen}
        onClose={() => { setIsNewMemoryModalOpen(false); setNewMemoryPending(null); }}
        onSuccess={() => {
          fetchMemories();
          fetch("/api/memories/stats").then((r) => r.json()).then(setStats);
          setNewMemoryPending(null);
        }}
        pending={newMemoryPending}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Memory?"
        message="Are you sure? This memory will be gone forever."
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      <DailyHighlightModal
        isOpen={isHighlightModalOpen}
        onClose={() => { setIsHighlightModalOpen(false); setEditingHighlight(null); }}
        onSuccess={() => { fetchHighlights(); setEditingHighlight(null); }}
        existing={editingHighlight}
      />

      <MemoryViewModal
        isOpen={!!viewMemory}
        onClose={() => setViewMemory(null)}
        memory={viewMemory}
        onEdit={(mem) => handleEdit(mem)}
        onDeleted={() => { fetchMemories(); fetch("/api/memories/stats").then((r) => r.json()).then(setStats); }}
      />

      <HighlightViewModal
        isOpen={!!viewHighlight}
        onClose={() => setViewHighlight(null)}
        highlight={viewHighlight}
        onEdit={(h) => { setEditingHighlight(h); setIsHighlightModalOpen(true); }}
        onDeleted={fetchHighlights}
      />
    </motion.main>
  );
}
