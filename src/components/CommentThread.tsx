"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { useSession } from "./SessionProvider";
import { getDisplayName } from "@/lib/names";
import type { Comment, CommentTarget, User } from "@/lib/types";

interface Props {
  targetType: CommentTarget;
  targetId: string;
  /** Render expanded immediately (e.g. inside a modal). Default collapsed. */
  defaultOpen?: boolean;
  /** Creator of the content. Only the partner (non-owner) may comment. */
  ownerId?: User | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function CommentThread({ targetType, targetId, defaultOpen = false, ownerId }: Props) {
  const { user } = useSession();
  const canInteract = !ownerId || user !== ownerId;
  const [open, setOpen] = useState(defaultOpen);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/comments?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`,
        { credentials: "same-origin" },
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setComments(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [targetType, targetId]);

  // Lazy-load the first time the thread is opened
  useEffect(() => {
    if (open && !loaded) load();
  }, [open, loaded, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !user || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ targetType, targetId, content, createdBy: user }),
      });
      if (res.ok) {
        const created: Comment = await res.json();
        setComments((prev) => [...prev, created]);
        setInput("");
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/comments/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ createdBy: user }),
    }).catch(() => {});
  };

  const count = loaded ? comments.length : null;
  const label =
    count === null
      ? "Comments"
      : count === 0
        ? "Comment"
        : `${count} comment${count > 1 ? "s" : ""}`;

  return (
    <div style={{ borderTop: "1px solid var(--divider)" }} className="mt-3 pt-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
        style={{ color: "var(--text-soft)" }}
      >
        <MessageCircle size={13} />
        {label}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-2.5">
              {loading ? (
                <p className="text-xs py-1" style={{ color: "var(--text-very)" }}>Loading…</p>
              ) : comments.length === 0 ? (
                <p className="text-xs py-1" style={{ color: "var(--text-very)" }}>
                  {canInteract ? "No comments yet — be the first 💬" : "No comments yet"}
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="group rounded-xl px-3 py-2 flex items-start justify-between gap-2"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--divider)" }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
                          {getDisplayName(c.createdBy)}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--text-very)" }}>
                          {relativeTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed break-words" style={{ color: "var(--text)" }}>
                        {c.content}
                      </p>
                    </div>
                    {c.createdBy === user && (
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        aria-label="Delete comment"
                        className="shrink-0 transition-opacity opacity-0 group-hover:opacity-100 hover:opacity-70"
                        style={{ color: "#c14a33" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {canInteract && (
              <form onSubmit={submit} className="flex items-center gap-2 mt-2.5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Add a comment…"
                  className="flex-1"
                  style={{ fontSize: 12.5 }}
                  maxLength={500}
                />
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.92 }}
                  disabled={!input.trim() || submitting}
                  aria-label="Send comment"
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: !input.trim() || submitting ? "var(--input-bg)" : "var(--accent)",
                    color: !input.trim() || submitting ? "var(--text-very)" : "var(--on-accent)",
                    border: "1px solid var(--divider)",
                  }}
                >
                  <Send size={14} />
                </motion.button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
