"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import AppShell, { Fab } from "@/components/AppShell";
import MemoryViewModal from "@/components/MemoryViewModal";
import HighlightViewModal from "@/components/HighlightViewModal";
import DailyHighlightModal from "@/components/DailyHighlightModal";
import Skeleton from "@/components/Skeleton";
import { getCategoryById } from "@/lib/categories";
import { spellDate } from "@/lib/volume";
import { useTheme } from "@/components/ThemeProvider";
import type { DailyHighlight, User } from "@/lib/types";

const TZ = "+04:00";

interface Memory {
  id: string;
  journal: string | null;
  photos: string | null;
  createdAt: string;
  createdBy: User;
  event: { title: string; date: string; category: string | null };
}

interface TimelineRow {
  id: string;
  title: string;
  date: string;
  time: string;
  allDay: boolean;
  category: string | null;
  notes: string | null;
  memoryId: string | null;
  memoryJournal: string | null;
  memoryFirstPhoto: string | null;
}

type FeedItem =
  | { kind: "memory"; at: Date; photo: string | null; data: Memory }
  | { kind: "written"; at: Date; photo: string | null; data: DailyHighlight };

function dayStart(iso: string) {
  return new Date(`${iso.split("T")[0]}T00:00:00${TZ}`);
}
function firstPhoto(json: string | null): string | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json) as string[];
    return arr[0] ?? null;
  } catch { return null; }
}

export default function StoryPage() {
  const [tab, setTab] = useState<"memories" | "timeline">("memories");
  const w = useTheme().definition.words;

  const [memories, setMemories] = useState<Memory[]>([]);
  const [highlights, setHighlights] = useState<DailyHighlight[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMemory, setViewMemory] = useState<Memory | null>(null);
  const [viewHighlight, setViewHighlight] = useState<DailyHighlight | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<DailyHighlight | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/memories").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setMemories(d); }).catch(() => {}),
      fetch("/api/highlights").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setHighlights(d); }).catch(() => {}),
      fetch("/api/timeline").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setTimeline(d); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Memories and written highlights, woven into one feed. */
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...memories.map((m) => ({
        kind: "memory" as const,
        at: dayStart(m.event.date),
        photo: firstPhoto(m.photos),
        data: m,
      })),
      ...highlights.map((h) => ({
        kind: "written" as const,
        at: dayStart(h.date),
        photo: firstPhoto(h.photos),
        data: h,
      })),
    ];
    return items.sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [memories, highlights]);

  const boundThisYear = useMemo(() => {
    const y = new Date().getFullYear();
    return feed.filter((f) => f.at.getFullYear() === y).length;
  }, [feed]);

  /** Timeline grouped into months, earliest first — it is a record, read
   *  forwards. Newest-first opened on August 2027, because a weekly series
   *  generates a year ahead and those future instances sorted to the top. */
  const months = useMemo(() => {
    const groups = new Map<string, TimelineRow[]>();
    [...timeline]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((row) => {
        const d = dayStart(row.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      });
    return Array.from(groups.entries()).map(([key, rows]) => {
      const [y, m] = key.split("-").map(Number);
      return {
        key,
        label: new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        rows,
      };
    });
  }, [timeline]);

  const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const spelled = boundThisYear < words.length ? words[boundThisYear] : String(boundThisYear);

  return (
    <AppShell
      active="story"
      fab={<Fab label={w.writtenFab} onClick={() => { setEditingHighlight(null); setComposeOpen(true); }} />}
    >
      <header className="pt-5">
        <h1 className="rr-display" style={{ fontSize: 26, color: "var(--ink)" }}>Our Story</h1>
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          {spelled} {boundThisYear === 1 ? "entry" : "entries"} {w.storyVerb} this year
        </p>
      </header>

      {/* Tabs on a shared baseline */}
      <div className="rr-tabs mt-6">
        <button className="rr-tab" data-active={tab === "memories"} onClick={() => setTab("memories")}>
          Memories
        </button>
        <button className="rr-tab" data-active={tab === "timeline"} onClick={() => setTab("timeline")}>
          Timeline
        </button>
      </div>

      {loading ? (
        <div className="mt-7 flex flex-col gap-5">
          <Skeleton className="h-64" />
          <Skeleton className="h-24" />
        </div>
      ) : tab === "memories" ? (
        /* ── Memories: one mixed feed ── */
        feed.length === 0 ? (
          <p className="rr-italic text-center mt-16" style={{ fontSize: 19, color: "var(--ghost)" }}>
            {w.storyEmpty}
          </p>
        ) : (
          <div className="mt-7 flex flex-col gap-9">
            {feed.map((item, i) => {
              const dateLabel = spellDate(item.at, { weekday: false }).toUpperCase();

              // Photo-ness decides the card, not the source: a written entry
              // with a photograph still gets a frame.
              if (!item.photo) {
                // Written entry — a gold rule, no card, no image.
                const text = item.kind === "written"
                  ? (item.data.note ?? "")
                  : (item.data.journal ?? item.data.event.title);
                const label = item.kind === "written"
                  ? `Written · ${dateLabel}`
                  : `${getCategoryById(item.data.event.category).label} · ${dateLabel}`;
                return (
                  <button
                    key={`${item.kind}-${item.data.id}`}
                    className="text-left rr-quote"
                    style={{ fontStyle: "normal" }}
                    onClick={() => item.kind === "written"
                      ? setViewHighlight(item.data)
                      : setViewMemory(item.data)}
                  >
                    <p className="rr-meta" style={{ fontSize: 10, letterSpacing: ".2em" }}>{label}</p>
                    <p className="rr-display mt-2" style={{ fontSize: 20, lineHeight: 1.4, color: "var(--ink)", fontWeight: 400 }}>
                      {text || "—"}
                    </p>
                  </button>
                );
              }

              const isSmall = i % 3 === 2; // a change of rhythm every third entry
              // A memory is titled by its event; a written entry has only its
              // own words, so those carry the card rather than an invented title.
              const title = item.kind === "memory" ? item.data.event.title : (item.data.note ?? "");
              const caption = item.kind === "memory" ? item.data.journal : null;
              const catLabel = item.kind === "memory"
                ? getCategoryById(item.data.event.category).label
                : "Written";

              if (isSmall) {
                return (
                  <button
                    key={`${item.kind}-${item.data.id}`}
                    className="text-left rr-frame flex gap-4"
                    onClick={() => item.kind === "memory"
                      ? setViewMemory(item.data)
                      : setViewHighlight(item.data)}
                  >
                    <img src={item.photo} alt="" style={{ width: 112, height: 112, flex: "none" }} />
                    <span className="min-w-0 flex-1">
                      <span className="rr-meta block" style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--terracotta)" }}>
                        {catLabel} · {dateLabel}
                      </span>
                      <span
                        className={item.kind === "memory" ? "rr-display block mt-1.5" : "rr-italic block mt-1.5"}
                        style={{
                          fontSize: item.kind === "memory" ? 20 : 16,
                          lineHeight: item.kind === "memory" ? 1.2 : 1.4,
                          color: "var(--ink)",
                        }}
                      >
                        {title.length > 120 ? title.slice(0, 120) + "…" : title}
                      </span>
                      {caption && (
                        <span className="rr-italic block mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
                          {caption.length > 90 ? caption.slice(0, 90) + "…" : caption}
                        </span>
                      )}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={`${item.kind}-${item.data.id}`}
                  className="text-left rr-frame block"
                  onClick={() => item.kind === "memory"
                    ? setViewMemory(item.data)
                    : setViewHighlight(item.data)}
                >
                  <img src={item.photo} alt="" style={{ aspectRatio: "4 / 3" }} />
                  <span className="block pt-3">
                    <span className="rr-meta block" style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--terracotta)" }}>
                      {catLabel} · {dateLabel}
                    </span>
                    <span
                      className={item.kind === "memory" ? "rr-display block mt-1.5" : "rr-italic block mt-1.5"}
                      style={{
                        fontSize: item.kind === "memory" ? 22 : 18,
                        lineHeight: item.kind === "memory" ? 1.2 : 1.45,
                        color: "var(--ink)",
                      }}
                    >
                      {title}
                    </span>
                    {caption && (
                      <span className="rr-italic block mt-1.5" style={{ fontSize: 18, lineHeight: 1.45, color: "var(--muted)" }}>
                        {caption}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )
      ) : (
        /* ── Timeline: a ledger ── */
        months.length === 0 ? (
          <p className="rr-italic text-center mt-16" style={{ fontSize: 19, color: "var(--ghost)" }}>
            {w.ledgerEmpty}
          </p>
        ) : (
          <div className="mt-7">
            {months.map((month) => (
              <div key={month.key} className="mb-8">
                <p
                  className="rr-display"
                  style={{ fontSize: 13, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--faint)" }}
                >
                  {month.label}
                </p>
                <div className="mt-3">
                  {month.rows.map((row) => {
                    const d = dayStart(row.date);
                    const bound = !!row.memoryId;
                    return (
                      <div
                        key={row.id}
                        className="flex gap-4 py-4"
                        style={{ borderTop: "1px solid var(--rule)" }}
                      >
                        <span
                          className="rr-display text-right"
                          style={{
                            width: 46,
                            flex: "none",
                            fontSize: 20,
                            lineHeight: 1.1,
                            color: bound ? "var(--terracotta)" : "var(--ink)",
                          }}
                        >
                          {d.getDate()}
                        </span>
                        <div className="flex-1 min-w-0" style={{ borderLeft: "1px solid var(--rule)", paddingLeft: 16 }}>
                          {row.memoryFirstPhoto && (
                            <img
                              src={row.memoryFirstPhoto}
                              alt=""
                              className="mb-2"
                              style={{ width: "100%", maxWidth: 320, height: 118, objectFit: "cover" }}
                            />
                          )}
                          <p className="rr-display" style={{ fontSize: 19, lineHeight: 1.2, color: "var(--ink)" }}>
                            {row.title}
                          </p>
                          <p className="rr-italic mt-0.5" style={{ fontSize: 14, color: "var(--muted)" }}>
                            {getCategoryById(row.category).label}
                            {!row.allDay && row.time ? ` · ${row.time.replace(":", ".")}` : " · all day"}
                          </p>
                          {row.memoryJournal && (
                            <p className="rr-italic mt-1.5" style={{ fontSize: 15, color: "var(--muted)" }}>
                              {row.memoryJournal}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <MemoryViewModal
        isOpen={!!viewMemory}
        onClose={() => setViewMemory(null)}
        memory={viewMemory}
        onEdit={() => { /* amend flows through the memory modal itself */ }}
        onDeleted={load}
      />

      <HighlightViewModal
        isOpen={!!viewHighlight}
        onClose={() => setViewHighlight(null)}
        highlight={viewHighlight}
        onEdit={(h) => { setEditingHighlight(h); setComposeOpen(true); }}
        onDeleted={load}
      />

      <DailyHighlightModal
        isOpen={composeOpen}
        onClose={() => { setComposeOpen(false); setEditingHighlight(null); }}
        onSuccess={() => { load(); setEditingHighlight(null); }}
        existing={editingHighlight}
      />
    </AppShell>
  );
}
