"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TargetIcon, XIcon, PlusIcon, CheckIcon, ArchiveIcon } from "@/components/icons";
import { getCategoryById } from "@/lib/categories";
import type { BucketItem } from "@/lib/types";

interface BucketListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BucketListDrawer({ isOpen, onClose }: BucketListDrawerProps) {
  const [items, setItems] = useState<BucketItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/bucket")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {});
  }, [isOpen]);

  const refreshItems = () => {
    fetch("/api/bucket")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {});
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bucket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) { setNewTitle(""); refreshItems(); }
    } catch { /* ignore */ }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/bucket/${id}`, { method: "DELETE" });
    refreshItems();
  };

  const handleToggleComplete = async (item: BucketItem) => {
    await fetch(`/api/bucket/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !item.completed }),
    });
    refreshItems();
  };

  const filteredItems = showCompleted ? items : items.filter((i) => !i.completed);
  const completedCount = items.filter((i) => i.completed).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50" style={{ background: "rgba(40, 25, 15, 0.45)", backdropFilter: "blur(4px)" }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem] shadow-xl max-h-[65vh] flex flex-col"
            style={{ background: "var(--card-bg)" }}
          >
            <div className="p-6 border-b" style={{ borderColor: "var(--divider)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TargetIcon size={20} style={{ color: "var(--accent)" }} />
                  <h2 className="text-lg" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
                    Bucket List {completedCount > 0 && `(${completedCount} done)`}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowCompleted(!showCompleted)}
                    className="p-2 rounded-full text-xs font-bold"
                    style={{ background: showCompleted ? "var(--chip-bg)" : "transparent", color: "var(--text-soft)" }}>
                    <ArchiveIcon size={16} />
                  </button>
                  <button onClick={onClose} style={{ color: "var(--text-soft)" }}><XIcon size={20} /></button>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Add a date idea..."
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <button
                  onClick={handleAdd} disabled={isSubmitting || !newTitle.trim()}
                  className="rounded-xl px-4 py-2 flex items-center disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                  <PlusIcon size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {filteredItems.length === 0 ? (
                <p className="text-center text-sm py-8" style={{ color: "var(--text-soft)" }}>
                  {showCompleted ? "No completed items yet" : "Your bucket list is empty!"}
                </p>
              ) : (
                filteredItems.map((item) => {
                  const cat = getCategoryById(item.category);
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{
                        background: item.completed ? "rgba(106, 180, 120, 0.06)" : "var(--input-bg)",
                        borderColor: item.completed ? "rgba(106, 180, 120, 0.2)" : "var(--divider)",
                      }}>
                      <button onClick={() => handleToggleComplete(item)}
                        className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                        style={{
                          background: item.completed ? "#6ab478" : "transparent",
                          borderColor: item.completed ? "#6ab478" : "var(--text-very)",
                          color: "#fff",
                        }}>
                        {item.completed && <CheckIcon size={11} />}
                      </button>
                      <span className={`flex-1 text-sm truncate ${item.completed ? "line-through opacity-40" : ""}`}
                        style={{ color: "var(--text)" }}>
                        {cat.emoji} {item.title}
                      </span>
                      <button onClick={() => handleDelete(item.id)} className="opacity-30 hover:opacity-80">
                        <XIcon size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
