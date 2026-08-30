"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";
import Skeleton from "@/components/Skeleton";
import { useSession } from "@/components/SessionProvider";
import type { BucketItem } from "@/lib/types";

export default function ReadingListPage() {
  const { definition } = useTheme();
  const words = definition.words;
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<BucketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [showRead, setShowRead] = useState(false);

  const load = useCallback(() => {
    fetch("/api/bucket")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setItems(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    try {
      const res = await fetch("/api/bucket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title, category: "other", createdBy: user }),
      });
      if (res.ok) load();
    } catch { /* ignore */ }
  };

  const toggle = async (item: BucketItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed: !i.completed } : i)));
    await fetch(`/api/bucket/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ completed: !item.completed }),
    }).catch(() => {});
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/bucket/${id}`, { method: "DELETE", credentials: "same-origin" }).catch(() => {});
  };

  const unread = items.filter((i) => !i.completed);
  const read = items.filter((i) => i.completed);
  const visible = showRead ? read : unread;

  return (
    <AppShell active="reading-list">
      <header className="pt-5">
        <h1 className="rr-display" style={{ fontSize: 26, color: "var(--ink)" }}>{words.wishlist}</h1>
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          things to do together, not yet dated
        </p>
      </header>

      {/* Add */}
      <form onSubmit={add} className="mt-6 flex items-end gap-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="something to look forward to…"
          className="rr-display flex-1"
          style={{ fontSize: 20 }}
        />
        <button className="rr-action" style={{ color: "var(--terracotta)", paddingBottom: 12 }} disabled={!draft.trim()}>
          Add
        </button>
      </form>

      {/* Filters */}
      <div className="flex items-center gap-5 mt-5">
        <button className="rr-filter" data-active={!showRead} onClick={() => setShowRead(false)}>
          Unread ({unread.length})
        </button>
        <button className="rr-filter" data-active={showRead} onClick={() => setShowRead(true)}>
          Read ({read.length})
        </button>
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : visible.length === 0 ? (
        <p className="rr-italic text-center mt-16" style={{ fontSize: 19, color: "var(--ghost)" }}>
          {showRead ? "nothing crossed off yet" : "the list is empty"}
        </p>
      ) : (
        <div className="mt-5">
          {visible.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-4 py-4"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--rule-light)" }}
            >
              <button
                onClick={() => toggle(item)}
                aria-label={item.completed ? "Mark unread" : "Mark read"}
                style={{
                  width: 16, height: 16, flex: "none",
                  border: "1px solid var(--rule-strong)",
                  background: item.completed ? "var(--sage)" : "transparent",
                }}
              />
              <span
                className="rr-display flex-1 min-w-0"
                style={{
                  fontSize: 19,
                  color: item.completed ? "var(--ghost)" : "var(--ink)",
                  textDecoration: item.completed ? "line-through" : "none",
                }}
              >
                {item.title}
              </span>
              {!item.completed && (
                <button
                  className="rr-action"
                  style={{ flex: "none" }}
                  onClick={() => router.push(`/entry/new?title=${encodeURIComponent(item.title)}`)}
                >
                  Date it
                </button>
              )}
              <button
                className="rr-action rr-action-danger"
                style={{ flex: "none" }}
                onClick={() => remove(item.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
