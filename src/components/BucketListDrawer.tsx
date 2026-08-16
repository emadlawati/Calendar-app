"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TargetIcon, XIcon, PlusIcon, CheckIcon, ArchiveIcon, CategoryIcons } from "@/components/icons";
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

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic: BucketItem = {
      id: tempId,
      title: newTitle.trim(),
      category: "other",
      notes: null,
      completed: false,
      createdBy: "Husband",
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [optimistic, ...prev]);
    setNewTitle("");
    try {
      const res = await fetch("/api/bucket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title: optimistic.title }),
      });
      if (res.ok) {
        const { item: real }: { item: BucketItem } = await res.json();
        setItems((prev) => prev.map((i) => (i.id === tempId ? real : i)));
      } else {
        setItems((prev) => prev.filter((i) => i.id !== tempId));
      }
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/bucket/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const handleToggleComplete = async (item: BucketItem) => {
    const updated = { ...item, completed: !item.completed };
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    await fetch(`/api/bucket/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: updated.completed }),
    }).catch(() => {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    });
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
            className="fixed inset-0 z-40 modal-backdrop"
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
                  <h2 className="heading-font text-lg" style={{ color: "var(--accent)" }}>
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
                  const ItemIcon = CategoryIcons[cat.id];
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{
                        background: item.completed ? "color-mix(in srgb, var(--success) 6%, transparent)" : "var(--input-bg)",
                        borderColor: item.completed ? "color-mix(in srgb, var(--success) 20%, transparent)" : "var(--divider)",
                      }}>
                      <button onClick={() => handleToggleComplete(item)} aria-label={item.completed ? "Mark as not done" : "Mark as done"}
                        className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                        style={{
                          background: item.completed ? "var(--success)" : "transparent",
                          borderColor: item.completed ? "var(--success)" : "var(--text-very)",
                          color: "#fff",
                        }}>
                        {item.completed && <CheckIcon size={11} />}
                      </button>
                      <span className={`flex-1 text-sm truncate inline-flex items-center gap-1.5 ${item.completed ? "line-through opacity-40" : ""}`}
                        style={{ color: "var(--text)" }}>
                        {ItemIcon && <ItemIcon size={13} style={{ color: cat.dotColor, flexShrink: 0 }} />} {item.title}
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
