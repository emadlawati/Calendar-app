"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Check, Archive } from "lucide-react";
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
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {});
  }, [isOpen]);

  const refreshItems = () => {
    fetch("/api/bucket")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {});
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bucket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setNewTitle("");
        refreshItems();
      }
    } catch (err) {
      console.error("Add bucket item error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/bucket/${id}`, { method: "DELETE" });
      refreshItems();
    } catch (err) {
      console.error("Delete bucket item error:", err);
    }
  };

  const handleToggleComplete = async (item: BucketItem) => {
    try {
      await fetch(`/api/bucket/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !item.completed }),
      });
      refreshItems();
    } catch (err) {
      console.error("Toggle bucket item error:", err);
    }
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
            className="fixed inset-0 bg-text-dark/20 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-plush max-h-[70vh] flex flex-col"
          >
            <div className="p-6 border-b border-latte-brown/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎯</span>
                  <h2 className="text-lg font-sniglet text-text-dark">
                    Bucket List {completedCount > 0 && `(${completedCount} done)`}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className={`p-2 rounded-full text-xs font-bold transition-colors ${
                      showCompleted ? "bg-latte-brown/10 text-latte-brown" : "text-latte-brown/40"
                    }`}
                  >
                    <Archive size={16} />
                  </button>
                  <button onClick={onClose} className="p-2 text-latte-brown hover:text-text-dark transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Add a date idea..."
                  className="flex-1 bg-milk-white border-2 border-soft-peach rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blush-pink"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAdd}
                  disabled={isSubmitting || !newTitle.trim()}
                  className="bg-blush-pink text-text-dark rounded-xl px-3 py-2 disabled:opacity-50"
                >
                  <Plus size={18} />
                </motion.button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {filteredItems.length === 0 ? (
                <p className="text-center text-text-dark/40 text-sm py-8">
                  {showCompleted ? "No completed items yet 🎯" : "Your bucket list is empty! Add some date ideas."}
                </p>
              ) : (
                filteredItems.map((item) => {
                  const cat = getCategoryById(item.category);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        item.completed
                          ? "bg-green-50/50 border-green-200"
                          : "bg-milk-white/50 border-soft-peach/50"
                      }`}
                    >
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => handleToggleComplete(item)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          item.completed
                            ? "bg-green-400 border-green-400 text-white"
                            : "border-latte-brown/30 hover:border-green-400"
                        }`}
                      >
                        {item.completed && <Check size={12} />}
                      </motion.button>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm ${
                            item.completed ? "line-through text-text-dark/40" : "text-text-dark"
                          }`}
                        >
                          {cat.emoji} {item.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-latte-brown/30 hover:text-red-400 transition-colors p-1 shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
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
