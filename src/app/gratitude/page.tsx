"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { getDisplayName } from "@/lib/names";
import type { Gratitude } from "@/lib/types";

const PROMPTS = [
  "the way you laugh at your own jokes",
  "how you always make the coffee just right",
  "your patience with me",
  "the little things you do without being asked",
  "how safe you make me feel",
];

function authorColor(who: string): string {
  return who === "Wife" ? "#6b3a1f" : "#c14a33";
}

export default function GratitudePage() {
  const { user } = useSession();
  const [entries, setEntries] = useState<Gratitude[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/gratitude", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEntries(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || !user || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/gratitude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ content: text, createdBy: user }),
      });
      if (res.ok) {
        const created: Gratitude = await res.json();
        setEntries((prev) => [created, ...prev]);
        setContent("");
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const remove = async (id: string) => {
    setEntries((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/gratitude/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ createdBy: user }),
    }).catch(() => {});
  };

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
          🫙 Gratitude Jar
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
        Little things we appreciate about each other 💛 — drop one in anytime.
      </p>

      {/* Composer */}
      <form onSubmit={submit} className="mb-6 p-4 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="I appreciate…"
          rows={2}
          maxLength={400}
          style={{ resize: "vertical", minHeight: 56 }}
        />
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {PROMPTS.map((p) => (
            <button key={p} type="button" onClick={() => setContent(p)} className="chip-pill text-[11px]">
              {p}
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-3">
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={!content.trim() || submitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: !content.trim() || submitting ? "var(--input-bg)" : "var(--accent)",
              color: !content.trim() || submitting ? "var(--text-very)" : "var(--on-accent)",
            }}
          >
            <Send size={14} />
            {submitting ? "Adding…" : "Add to jar"}
          </motion.button>
        </div>
      </form>

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-3xl">☕</motion.div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--text-soft)" }}>
          <p className="text-5xl mb-3">🫙</p>
          <p className="text-lg mb-1" style={{ fontFamily: "var(--font-caprasimo), cursive" }}>The jar is empty</p>
          <p className="text-sm">Add the first thing you appreciate 💛</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 gap-4 space-y-4">
          <AnimatePresence>
            {entries.map((g) => (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="break-inside-avoid group relative rounded-2xl border p-4"
                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
              >
                <span className="absolute top-3 right-3 text-base opacity-60">💛</span>
                <p className="text-sm leading-relaxed pr-6" style={{ color: "var(--text)" }}>{g.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: authorColor(g.createdBy), color: "#fce8c8", fontFamily: "var(--font-caprasimo), cursive" }}>
                      {getDisplayName(g.createdBy)[0]}
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>{getDisplayName(g.createdBy)}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-very)" }}>
                      · {new Date(g.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  {g.createdBy === user && (
                    <button
                      onClick={() => remove(g.id)}
                      aria-label="Delete appreciation"
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70"
                      style={{ color: "#c14a33" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.main>
  );
}
