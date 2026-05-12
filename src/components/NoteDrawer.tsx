"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartIcon, XIcon, SendIcon } from "@/components/icons";
import { getDisplayName } from "@/lib/names";
import { useSession } from "./SessionProvider";

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
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

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
                Send {partnerDisplay} a note
              </span>
            </div>
            <button onClick={onClose} style={{ color: "var(--text-soft)" }}>
              <XIcon size={16} />
            </button>
          </div>

          {sent ? (
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
                she&apos;ll see it next time she opens the app
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

              {/* Preset chips */}
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
          )}
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
