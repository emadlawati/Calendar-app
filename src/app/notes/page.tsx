"use client";

import { useState, useEffect, useRef } from "react";
import AppShell from "@/components/AppShell";
import Skeleton from "@/components/Skeleton";
import { useSession, useNames, usePartnerName } from "@/components/SessionProvider";
import type { Note, NoteKind } from "@/lib/types";

function stampDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    .toUpperCase();
}

function PaperPlane() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M16.5 1.5 1.5 7.5l5.5 2.2M16.5 1.5 10.5 16.5l-3.5-6.8M16.5 1.5 7 9.7"
        stroke="var(--gold)" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

export default function LettersPage() {
  const { user } = useSession();
  const displayName = useNames();
  const partnerName = usePartnerName();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<NoteKind>("note");
  const [sending, setSending] = useState(false);
  const newlyReceived = useRef<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    fetch("/api/notes", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: Note[]) => {
        if (!Array.isArray(data)) return;
        setNotes(data);
        if (user) {
          const unread = data.filter((n) => n.createdBy !== user && !n.read);
          unread.forEach((n) => {
            newlyReceived.current.add(n.id);
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

  return (
    <AppShell active="letters">
      <header className="pt-5">
        <h1 className="rr-display" style={{ fontSize: 26, color: "var(--ink)" }}>Letters</h1>
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          notes and appreciations, kept between the two of you
        </p>
      </header>

      {/* Correspondence — newest first, alternating by sender */}
      <div className="mt-7 flex flex-col gap-6" style={{ paddingBottom: 150 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : notes.length === 0 ? (
          <p className="rr-italic text-center mt-12" style={{ fontSize: 19, color: "var(--ghost)" }}>
            no letters yet — the rest of the page is blank
          </p>
        ) : (
          notes.map((n) => {
            const mine = n.createdBy === user;
            const label = n.kind === "gratitude" ? "Appreciation" : "Note";

            if (mine) {
              // Sent — a green block, right-aligned
              return (
                <div key={n.id} className="flex flex-col items-end">
                  <div style={{ background: "var(--green-deep)", padding: "16px 18px", maxWidth: "88%" }}>
                    <p className="rr-italic" style={{ fontSize: 20, lineHeight: 1.4, color: "var(--paper)" }}>
                      {n.content}
                    </p>
                  </div>
                  <p className="rr-meta mt-2" style={{ fontSize: 10 }}>
                    {stampDate(n.createdAt)} · {n.read ? "Read" : "Unread"}
                  </p>
                </div>
              );
            }

            // Received — a double-ruled letter card
            return (
              <div key={n.id} className="rr-double" style={{ maxWidth: "92%" }}>
                <div style={{ padding: 18 }}>
                  <p className="rr-meta" style={{ fontSize: 10, color: "var(--terracotta)" }}>
                    From {displayName(n.createdBy)} · {label}
                  </p>
                  <p className="rr-italic mt-2.5" style={{ fontSize: 20, lineHeight: 1.4, color: "var(--ink)" }}>
                    {n.content}
                  </p>
                  <p className="rr-meta mt-3" style={{ fontSize: 10 }}>{stampDate(n.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer — pinned */}
      <form
        onSubmit={submit}
        className="fixed bottom-0 inset-x-0 lg:pl-[298px] z-30"
        style={{ background: "var(--wash)", borderTop: "1px solid var(--rule-strong)" }}
      >
        <div className="mx-auto px-[22px] py-4" style={{ maxWidth: 640 }}>
          <div className="flex items-center gap-6">
            <button type="button" className="rr-filter" data-active={kind === "note"} onClick={() => setKind("note")}>
              Note
            </button>
            <button type="button" className="rr-filter" data-active={kind === "gratitude"} onClick={() => setKind("gratitude")}>
              Appreciation
            </button>
          </div>

          <div className="flex items-stretch gap-3 mt-2">
            <div className="rr-field flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={1}
                maxLength={500}
                placeholder={kind === "gratitude" ? "I appreciate…" : "say something…"}
                style={{ resize: "none", minHeight: 26 }}
                aria-label={`Write a ${kind === "gratitude" ? "appreciation" : "note"} to ${partnerName}`}
              />
            </div>
            <button
              type="submit"
              disabled={!content.trim() || sending}
              aria-label="Send"
              style={{
                width: 46, height: 46, flex: "none",
                background: content.trim() && !sending ? "var(--green-deep)" : "var(--ghost)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <PaperPlane />
            </button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
