"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Heart, MessageSquare } from "lucide-react";
import { getDisplayName } from "@/lib/names";
import type { StickyNote as StickyNoteType } from "@/lib/types";

interface NoteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NoteDrawer({ isOpen, onClose }: NoteDrawerProps) {
  const [content, setContent] = useState("");
  const [sentNotes, setSentNotes] = useState<StickyNoteType[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch all notes (both sent and received) for context
      fetch("/api/notes/all")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setSentNotes(data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!content.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        setContent("");
        setJustSent(true);
        setTimeout(() => setJustSent(false), 2000);
        // Refresh list
        const r = await fetch("/api/notes/all");
        const data = await r.json();
        if (Array.isArray(data)) setSentNotes(data);
      }
    } catch (err) {
      console.error("Send note error:", err);
    } finally {
      setIsSending(false);
    }
  };

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-plush max-h-[60vh] flex flex-col"
          >
            <div className="p-6 border-b border-latte-brown/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Heart size={20} className="text-red-400" />
                  <h2 className="text-lg font-sniglet text-text-dark">Send a Love Note</h2>
                </div>
                <button onClick={onClose} className="p-2 text-latte-brown hover:text-text-dark transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write something sweet..."
                  className="flex-1 bg-milk-white border-2 border-soft-peach rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blush-pink transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  autoFocus
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={isSending || !content.trim()}
                  className={`rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors ${
                    justSent
                      ? "bg-green-100 text-green-700"
                      : "bg-red-400 text-white hover:bg-red-500 disabled:opacity-50"
                  }`}
                >
                  {justSent ? "Sent! 💕" : <><Send size={16} /> Send</>}
                </motion.button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-[10px] uppercase tracking-wider font-bold text-text-dark/30 mb-3">Recent Notes</p>
              {sentNotes.length === 0 ? (
                <p className="text-center text-text-dark/40 text-sm py-4">No notes yet 💌</p>
              ) : (
                <div className="space-y-2">
                  {sentNotes.map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-milk-white/50 border border-soft-peach/50"
                    >
                      <MessageSquare size={14} className="text-blush-pink shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-dark truncate">{note.content}</p>
                        <p className="text-[10px] text-text-dark/30 mt-0.5">
                          {getDisplayName(note.createdBy)}
                          {note.read ? " · Read ✓" : " · Unread"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
