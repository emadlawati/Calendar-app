"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import MemoryCard from "@/components/MemoryCard";
import SaveMemoryModal from "@/components/SaveMemoryModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ArrowLeft } from "lucide-react";

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

interface MemoryStats {
  totalMemories: number;
  categoryCounts: { category: string; count: number; emoji: string }[];
  thisYearCount: number;
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [editMemory, setEditMemory] = useState<Memory | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Memory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--text-soft)" }}>
          <ArrowLeft size={16} />
          Calendar
        </Link>
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
          Memory Wall
        </h1>
      </div>

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
              onEdit={handleEdit}
              onDelete={(mem) => setDeleteTarget(mem)}
            />
          ))}
        </div>
      )}

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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Memory?"
        message="Are you sure? This memory will be gone forever."
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </motion.main>
  );
}
