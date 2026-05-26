"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartIcon, XIcon, SendIcon } from "@/components/icons";
import { getDisplayName } from "@/lib/names";
import { useSession } from "./SessionProvider";
import type { StickyNote } from "@/lib/types";

const PRESETS = [
  "thinking of you ♥",
  "pick me up some coffee?",
  "miss you already",
  "you're my favorite human",
  "goodnight, my love",
];

interface NoteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NoteDrawer({ isOpen, onClose }: NoteDrawerProps) {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState<"send" | "sent">("send");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentNotes, setSentNotes] = useState<StickyNote[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);

  useEffect(() => {
    if (activeTab === "sent" && isOpen) {
      setLoadingSent(true);
      fetch("/api/notes?sent=true", { credentials: "same-origin" })
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setSentNotes(data); })
        .catch(() => {})
        .finally(() => setLoadingSent(false));
    }
  }, [activeTab, isOpen]);

  if (!user) return null;

  const partner = user === "Wife" ? "Husband" : "Wife";
  const partnerDisplay = getDisplayName(partner);

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
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setContent("");
          onClose();
        }, 1600);
      }
    } catch { /* ignore */ }
    setIsSending(false);
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
            className="fixed inset-0 z-50"
            style={{ background: "rgba(40, 25, 15, 0.3)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="fixed top-20 sm:top-[88px] right-4 sm:right-6 left-4 sm:left-auto sm:w-80 z-50 p-4 sm:p-[18px] note-card"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span style={{ color: "#c14a33" }}><HeartIcon size={16} /></span>
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  Notes to {partnerDisplay}
                </span>
              </div>
              <button onClick={onClose} style={{ color: "var(--text-soft)" }}>
                <XIcon size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "var(--input-bg)" }}>
              {(["send", "sent"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                  style={{
                    background: activeTab === tab ? "var(--card-bg)" : "transparent",
                    color: activeTab === tab ? "var(--accent)" : "var(--text-soft)",
                    boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {tab === "send" ? "Send" : "Sent"}
                </button>
              ))}
            </div>

            {activeTab === "send" ? (
              sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="text-4xl mb-2">💌</div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    sent with love
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-soft)" }}>
                    {partnerDisplay.toLowerCase()} will see it next time she opens the app
                  </p>
                </motion.div>
              ) : (
                <>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="say something cute…"
                    className="w-full rounded-xl p-3 text-[13.5px] resize-none outline-none mb-3"
                    style={{
                      minHeight: 80,
                      background: "var(--input-bg)",
                      border: "1.5px solid var(--input-border)",
                      color: "var(--text)",
                      fontFamily: "var(--font-outfit), sans-serif",
                    }}
                  />

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setContent(preset)}
                        className="chip-pill"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={!content.trim() || isSending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 transition-all"
                    style={{
                      background: "var(--accent)",
                      color: "var(--on-accent)",
                    }}
                  >
                    <SendIcon size={14} />
                    {isSending ? "Sending..." : "Send note"}
                  </button>
                </>
              )
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loadingSent ? (
                  <p className="text-center text-xs py-4" style={{ color: "var(--text-soft)" }}>Loading...</p>
                ) : sentNotes.length === 0 ? (
                  <p className="text-center text-xs py-6" style={{ color: "var(--text-soft)" }}>
                    You haven't sent any notes yet 💌
                  </p>
                ) : (
                  sentNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--divider)" }}
                    >
                      <p className="text-[13px] leading-snug" style={{ color: "var(--text)" }}>{note.content}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px]" style={{ color: "var(--text-very)" }}>
                          {new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {note.read ? (
                          <span className="text-[10px]" style={{ color: "var(--text-very)" }}>seen ✓</span>
                        ) : (
                          <span className="text-[10px]" style={{ color: "var(--text-very)" }}>not seen yet</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
