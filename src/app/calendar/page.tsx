"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Fab } from "@/components/AppShell";
import EntrySheet from "@/components/EntrySheet";
import ReminderModal from "@/components/ReminderModal";
import SaveMemoryModal from "@/components/SaveMemoryModal";
import Toast from "@/components/Toast";
import { usePeople } from "@/components/SessionProvider";
import Skeleton from "@/components/Skeleton";
import { WEEKDAY_LETTERS, weekdayIndex } from "@/lib/week";
import { useHijri } from "@/components/SessionProvider";
import { useTheme } from "@/components/ThemeProvider";
import { getCategoryById } from "@/lib/categories";
import { spellDate, spellTime } from "@/lib/volume";
import type { CalendarEvent, Reminder, PendingMemory } from "@/lib/types";

const TZ = "+04:00";


function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayStart(iso: string) {
  return new Date(`${iso.split("T")[0]}T00:00:00${TZ}`);
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
/** [year, monthIndex] of "today" in Muscat. */
function todayKeyParts(): [number, number] {
  const k = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });
  const [y, m] = k.split("-").map(Number);
  return [y, m - 1];
}

/**
 * Observatory's grid overlay.
 *
 * The brief removes the row separators from this theme's calendar entirely —
 * "the sky has no rules" — and puts the structure back as a polyline drawn
 * through the month's event days, so the shape of a busy month is the shape of
 * a constellation. Everything else about the grid is unchanged.
 */
function Constellation({
  cells,
  byDay,
}: {
  cells: { key: string; inMonth: boolean }[];
  byDay: Map<string, unknown[]>;
}) {
  // Cell centres in a 7 × 6 unit box, matched to the grid by viewBox rather
  // than by measuring the DOM.
  // This month's event days only — a line reaching into the trailing days of
  // the last month would be drawing a constellation the month does not have.
  const points = cells
    .map((c, i) => ({ i, has: c.inMonth && (byDay.get(c.key)?.length ?? 0) > 0 }))
    .filter((c) => c.has)
    .map(({ i }) => ({ x: (i % 7) + 0.5, y: Math.floor(i / 7) + 0.5 }));

  if (points.length < 2) return null;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg
      aria-hidden
      viewBox="0 0 7 6"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <path d={d} fill="none" stroke="var(--gold)" strokeWidth="0.012" opacity="0.45" />
    </svg>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const people = usePeople();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [todayKey] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" }));
  const [anchor, setAnchor] = useState(() => {
    const [y, m] = todayKeyParts();
    return new Date(y, m, 1);
  });
  const [selected, setSelected] = useState<string>(todayKey);

  const [filterPerson, setFilterPerson] = useState<string | null>(null);
  const [sheetEvent, setSheetEvent] = useState<CalendarEvent | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [bindTarget, setBindTarget] = useState<PendingMemory | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [ev, rm] = await Promise.all([
        fetch("/api/events", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/reminders").then((r) => r.json()).catch(() => []),
      ]);
      if (Array.isArray(ev)) setEvents(ev.filter((e: CalendarEvent) => !e.archived));
      if (Array.isArray(rm)) setReminders(rm);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const visibleEvents = useMemo(
    () => (filterPerson ? events.filter((e) => e.personTag === filterPerson) : events),
    [events, filterPerson],
  );

  /** date key -> events occurring that day (multi-day spans fill every day) */
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of visibleEvents) {
      const start = dayStart(e.date as string);
      const end = e.endDate ? dayStart(e.endDate as string) : start;
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const k = ymd(d);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(e);
      }
    }
    return map;
  }, [visibleEvents]);

  const multiDayKeys = useMemo(() => {
    const s = new Set<string>();
    for (const e of visibleEvents) {
      if (!e.endDate) continue;
      const start = dayStart(e.date as string);
      const end = dayStart(e.endDate as string);
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) s.add(ymd(d));
    }
    return s;
  }, [visibleEvents]);

  /** 42 cells, Monday-first. */
  const cells = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const offset = weekdayIndex(first.getDay());
    const gridStart = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = addDays(gridStart, i);
      return { date: d, key: ymd(d), inMonth: d.getMonth() === anchor.getMonth() };
    });
  }, [anchor]);

  const selectedDate = useMemo(() => dayStart(selected), [selected]);
  const hijriOf = useHijri();
  const { theme, definition } = useTheme();
  const sky = theme === "observatory";
  const selectedHijri = hijriOf(selectedDate);
  const dayEvents = byDay.get(selected) ?? [];
  const dayReminders = useMemo(
    () => reminders.filter((r) => ymd(dayStart(r.date as string)) === selected),
    [reminders, selected],
  );

  const agenda = useMemo(() => {
    const rows = [
      ...dayEvents.map((e) => ({
        id: e.id,
        kind: "event" as const,
        allDay: e.allDay,
        time: e.time,
        title: e.title,
        detail: [getCategoryById(e.category).label, e.endTime ? `until ${spellTime(e.endTime)}` : null]
          .filter(Boolean).join(" · "),
        event: e,
      })),
      ...dayReminders.map((r) => ({
        id: r.id,
        kind: "reminder" as const,
        allDay: false,
        time: r.time,
        title: r.title,
        detail: "Reminder",
        event: null,
      })),
    ];
    return rows.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return (a.time || "").localeCompare(b.time || "");
    });
  }, [dayEvents, dayReminders]);

  const monthLabel = `${anchor.toLocaleDateString("en-GB", { month: "long" })} ${anchor.getFullYear()}`;

  return (
    <AppShell active="calendar" fab={<Fab onClick={() => router.push(`/entry/new?date=${selected}`)} />}>
      {/* Header */}
      <header className="pt-5 flex items-baseline justify-between gap-4">
        <h1 className="rr-display" style={{ fontSize: 26, color: "var(--ink)" }}>
          {anchor.toLocaleDateString("en-GB", { month: "long" })}{" "}
          <span className="rr-italic" style={{ color: "var(--muted)", fontSize: 22 }}>
            {anchor.getFullYear()}
          </span>
        </h1>
        <div className="flex items-center gap-5" style={{ flex: "none" }}>
          <button
            aria-label="Previous month"
            className="rr-display"
            style={{ fontSize: 26, color: "var(--sage)", lineHeight: 1 }}
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
          >‹</button>
          <button
            aria-label="Next month"
            className="rr-display"
            style={{ fontSize: 26, color: "var(--sage)", lineHeight: 1 }}
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
          >›</button>
        </div>
      </header>
      <span className="sr-only">{monthLabel}</span>

      {/* One line of text filters */}
      <div className="flex items-center gap-5 mt-5 overflow-x-auto no-scrollbar">
        {people.map((p) => (
          <button
            key={p.id}
            className="rr-filter whitespace-nowrap"
            data-active={filterPerson === p.id}
            onClick={() => setFilterPerson(filterPerson === p.id ? null : p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Month grid */}
      <div className="mt-4">
        <div className="grid grid-cols-7">
          {WEEKDAY_LETTERS.map((w, i) => (
            <div key={i} className="rr-label text-center pb-2" style={{ fontSize: 9.5 }}>{w}</div>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-[300px]" />
        ) : (
          <div className="grid grid-cols-7"
            style={{
              // "Grid has no row separators at all — the sky has no rules."
              // Observatory gets its structure from the constellation instead.
              borderTop: sky ? "none" : "1px solid var(--rule-light)",
              position: "relative",
            }}
          >
            {sky && <Constellation cells={cells} byDay={byDay} />}
            {cells.map((cell) => {
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selected;
              const evts = byDay.get(cell.key) ?? [];
              const dot = evts.length > 0 ? getCategoryById(evts[0].category).dotColor : null;
              const inSpan = multiDayKeys.has(cell.key);

              return (
                <button
                  key={cell.key}
                  onClick={() => setSelected(cell.key)}
                  className="flex flex-col items-center justify-center gap-1.5"
                  style={{
                    height: 50,
                    borderBottom: sky ? "none" : "1px solid var(--rule-light)",
                    background: isToday
                      ? "var(--today-bg, var(--green-deep))"
                      : inSpan ? "var(--tint)" : "transparent",
                    // Today is a filled circle in the round themes, a filled
                    // square in Reading Room, per each theme's shape rule.
                    borderRadius: isToday ? "var(--radius-chip, 0)" : 0,
                    outline: isSelected && !isToday ? "1.5px solid var(--rule-strong)" : "none",
                    outlineOffset: -1.5,
                    position: "relative",
                  }}
                >
                  <span
                    className="rr-display"
                    style={{
                      fontSize: 18,
                      lineHeight: 1,
                      color: isToday ? "var(--today-text, var(--paper))" : cell.inMonth ? "var(--ink)" : "var(--ghost)",
                    }}
                  >
                    {cell.date.getDate()}
                  </span>
                  <span
                    className="rr-dot"
                    style={{ background: dot ? (isToday ? "var(--gold)" : dot) : "transparent" }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Day agenda */}
      <section
        className="mt-6 -mx-[22px] px-[22px] py-6"
        style={{ background: "var(--wash)", borderTop: "1px solid var(--rule-strong)", minHeight: 220 }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="rr-label">
            {spellDate(selectedDate).toUpperCase()}
            {selectedHijri && (
              <span style={{ color: "var(--faint)" }}> · {selectedHijri}</span>
            )}
          </p>
          <button className="rr-action" style={{ fontSize: 11.5 }} onClick={() => setReminderOpen(true)}>
            Add a reminder
          </button>
        </div>

        {agenda.length === 0 ? (
          <p className="rr-italic text-center mt-10" style={{ fontSize: 19, color: "var(--ghost)" }}>
            {definition.words.emptyDay}
          </p>
        ) : (
          <div className="mt-3">
            {agenda.map((row, i) => (
              <button
                key={row.id}
                onClick={() => row.event && setSheetEvent(row.event)}
                className="w-full text-left flex gap-4 py-4"
                style={{ borderTop: i === 0 ? "none" : "1px dotted var(--rule-strong)" }}
              >
                <span
                  className="rr-meta"
                  style={{
                    width: 56,
                    flex: "none",
                    paddingTop: 4,
                    color: row.allDay ? "var(--terracotta)" : "var(--faint)",
                  }}
                >
                  {row.allDay ? "All day" : spellTime(row.time)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="rr-display block" style={{ fontSize: 20, lineHeight: 1.2, color: "var(--ink)" }}>
                    {row.title}
                  </span>
                  {row.detail && (
                    <span className="rr-italic block mt-0.5" style={{ fontSize: 14, color: "var(--muted)" }}>
                      {row.detail}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <EntrySheet
        event={sheetEvent}
        onClose={() => setSheetEvent(null)}
        onChanged={fetchAll}
        onBind={(e) => setBindTarget({
          event: { id: e.id, title: e.title, category: e.category ?? null },
          daysAgo: 0,
        })}
      />

      <ReminderModal
        isOpen={reminderOpen}
        onClose={() => setReminderOpen(false)}
        onSuccess={fetchAll}
        onToast={setToast}
      />

      <SaveMemoryModal
        isOpen={!!bindTarget}
        onClose={() => setBindTarget(null)}
        onSuccess={() => { setBindTarget(null); setToast("Bound into the volume."); fetchAll(); }}
        pending={bindTarget}
      />

      <Toast message={toast || ""} isVisible={toast !== null} onClose={() => setToast(null)} />
    </AppShell>
  );
}
