"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { getDisplayName } from "@/lib/names";
import type { Note, NoteKind } from "@/lib/types";

type Filter = "all" | "note" | "gratitude";

function authorColor(who: string): string {
  return who === "Wife" ? "#6b3a1f" : "#c14a33";
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function NotesPage() {
  const { user } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<NoteKind>("note");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  // Ids that were unread when the page loaded — keeps the "new" badge visible
  // for this visit even after we silently mark them read.
  const newlyReceived = useRef<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    fetch("/api/notes", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: Note[]) => {
        if (!Array.isArray(data)) return;
        setNotes(data);
        // Mark any unread notes from the partner as read (fire and forget)
        if (user) {
          const unread = data.filter((n) => n.createdBy !== user && !n.read);
          unread.forEach((n) => newlyReceived.current.add(n.id));
          unread.forEach((n) => {
            fetch(`/api/notes/${n.id}`, { method: "PATCH", credentials: "same-origin" }).catch(() => {});
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || !user || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ content: text, kind }),
      });
      if (res.ok) {
        const created: Note = await res.json();
        setNotes((prev) => [created, ...prev]);
        setContent("");
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const remove = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notes/${id}`, { method: "DELETE", credentials: "same-origin" }).catch(() => {});
  };

  const partnerName = user ? getDisplayName(user === "Wife" ? "Husband" : "Wife") : "your partner";
  const visible = filter === "all" ? notes : notes.filter((n) => n.kind === filter);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen max-w-3xl mx-auto px-4 sm:px-8 py-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--text-soft)" }}>
          <ArrowLeft size={16} />
          Calendar
        </Link>
        <h1 className="text-2xl flex items-center gap-2" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
          💌 Notes
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
        Little messages and appreciations between you and {partnerName}.
      </p>

      {/* Composer */}
      <form onSubmit={submit} className="mb-6 p-4 rounded-2xl border"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}>
        {/* Kind toggle */}
        <div className="flex gap-1 mb-3 p-1 rounded-xl w-fit" style={{ background: "var(--input-bg)" }}>
          {([
            { k: "note" as const, label: "💌 Note" },
            { k: "gratitude" as const, label: "💛 Appreciation" },
          ]).map(({ k, label }) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: kind === k ? "var(--card-bg)" : "transparent",
                color: kind === k ? "var(--accent)" : "var(--text-soft)",
                boxShadow: kind === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={kind === "gratitude" ? "I appreciate…" : "Say something…"}
          rows={2}
          maxLength={500}
          style={{ resize: "vertical", minHeight: 60 }}
        />

        <div className="flex justify-end mt-3">
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={!content.trim() || sending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: !content.trim() || sending ? "var(--input-bg)" : "var(--accent)",
              color: !content.trim() || sending ? "var(--text-very)" : "var(--on-accent)",
            }}
          >
            <Send size={14} />
            {sending ? "Sending…" : "Send"}
          </motion.button>
        </div>
      </form>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        {([
          { f: "all" as const, label: "All" },
          { f: "note" as const, label: "💌 Notes" },
          { f: "gratitude" as const, label: "💛 Appreciations" },
        ]).map(({ f, label }) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="chip-pill text-xs"
            style={{
              background: filter === f ? "var(--accent)" : "var(--chip-bg)",
              color: filter === f ? "var(--on-accent)" : "var(--chip-text)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Log */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-3xl">☕</motion.div>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--text-soft)" }}>
          <p className="text-5xl mb-3">💌</p>
          <p className="text-lg mb-1" style={{ fontFamily: "var(--font-caprasimo), cursive" }}>Nothing here yet</p>
          <p className="text-sm">Send the first one above</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {visible.map((n) => {
              const mine = n.createdBy === user;
              const isNew = !mine && newlyReceived.current.has(n.id);
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="group relative rounded-2xl border p-4"
                  style={{
                    background: "var(--card-bg)",
                    borderColor: isNew ? "var(--accent)" : "var(--card-border)",
                    boxShadow: "var(--card-shadow)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={{ background: authorColor(n.createdBy), color: "#fce8c8", fontFamily: "var(--font-caprasimo), cursive" }}>
                          {getDisplayName(n.createdBy)[0]}
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
                          {mine ? `You → ${partnerName}` : `${getDisplayName(n.createdBy)} → You`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "var(--chip-bg)", color: "var(--chip-text)", border: "1px solid var(--chip-border)" }}>
                          {n.kind === "gratitude" ? "💛 Appreciation" : "💌 Note"}
                        </span>
                        {isNew && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                            new
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed break-words" style={{ color: "var(--text)" }}>
                        {n.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px]" style={{ color: "var(--text-very)" }}>
                          {formatWhen(n.createdAt)}
                        </span>
                        {mine && (
                          <span className="text-[10px]" style={{ color: "var(--text-very)" }}>
                            · {n.read ? "seen ✓" : "not seen yet"}
                          </span>
                        )}
                      </div>
                    </div>
                    {mine && (
                      <button
                        onClick={() => remove(n.id)}
                        aria-label="Delete note"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70"
                        style={{ color: "#c14a33" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.main>
  );
}
