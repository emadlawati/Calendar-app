"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell, { Fab } from "@/components/AppShell";
import BookGlyph from "@/components/BookGlyph";
import EntrySheet from "@/components/EntrySheet";
import SaveMemoryModal from "@/components/SaveMemoryModal";
import PushPrompt from "@/components/PushPrompt";
import Toast from "@/components/Toast";
import Skeleton from "@/components/Skeleton";
import { useSession, useHijri } from "@/components/SessionProvider";
import { getCategoryById } from "@/lib/categories";
import { getVolumeInfo, spellDate, catalogueNumber } from "@/lib/volume";
import { specialDateLabel } from "@/lib/special-date-display";
import type {
  CalendarEvent, SpecialDateWithCountdown, PendingMemory, DailyHighlight,
} from "@/lib/types";

const TZ = "+04:00";

/** A bound memory or a written entry, flattened to what the card needs. */
interface ShelfEntry {
  key: string;
  title: string;
  date: string;
  categoryLabel: string;
  photo: string | null;
}

/** Muscat-local midnight for a YYYY-MM-DD(THH:MM) string. */
function dayStart(iso: string): Date {
  return new Date(`${iso.split("T")[0]}T00:00:00${TZ}`);
}

function firstPhoto(json: string | null): string | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json) as string[];
    return arr[0] ?? null;
  } catch { return null; }
}

/**
 * Pick one entry per day, seeded by the date — so the shelf offers something
 * different each morning, stays put all day, and shows both of them the same
 * page. FNV-1a keeps short date seeds well spread.
 */
function dailyPick<T>(items: T[], seed: string): T | null {
  if (items.length === 0) return null;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return items[Math.abs(h) % items.length];
}

function spanOf(e: CalendarEvent) {
  const start = dayStart(e.date as string);
  const end = e.endDate ? dayStart(e.endDate as string) : start;
  return { start, end };
}

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export default function Home() {
  const router = useRouter();
  const { isLoading: sessionLoading, couple } = useSession();
  const hijriOf = useHijri();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDateWithCountdown[]>([]);
  const [shelfEntries, setShelfEntries] = useState<ShelfEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [sheetEvent, setSheetEvent] = useState<CalendarEvent | null>(null);
  const [bindTarget, setBindTarget] = useState<PendingMemory | null>(null);

  const vol = getVolumeInfo(couple?.startDate);
  const [today] = useState(() => new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" }) + `T00:00:00${TZ}`));

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data.filter((e: CalendarEvent) => !e.archived));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchEvents(),
      fetch("/api/special-dates").then((r) => r.json()).then((d) => {
        if (Array.isArray(d)) setSpecialDates(d);
      }).catch(() => {}),
      // The shelf draws on everything bound — memories and written entries alike.
      Promise.all([
        fetch("/api/memories").then((r) => r.json()).catch(() => []),
        fetch("/api/highlights").then((r) => r.json()).catch(() => []),
      ]).then(([mems, highs]) => {
        const pool: ShelfEntry[] = [
          ...(Array.isArray(mems) ? mems : []).map((m: {
            id: string; journal: string | null; photos: string | null;
            event: { title: string; date: string; category: string | null };
          }) => ({
            key: `memory-${m.id}`,
            title: m.event.title,
            date: m.event.date,
            categoryLabel: getCategoryById(m.event.category).label,
            photo: firstPhoto(m.photos),
          })),
          ...(Array.isArray(highs) ? highs : []).map((h: DailyHighlight) => ({
            key: `written-${h.id}`,
            title: h.note?.trim() || "A day worth keeping",
            date: h.date,
            categoryLabel: "Written",
            photo: firstPhoto(h.photos),
          })),
        ].sort((a, b) => dayStart(b.date).getTime() - dayStart(a.date).getTime());
        setShelfEntries(pool);
      }),
    ]).finally(() => setLoading(false));

    const params = new URLSearchParams(window.location.search);
    if (params.get("accepted") === "true") {
      setToast("The plan has been accepted.");
      window.history.replaceState({}, "", "/");
    } else if (params.get("google") === "connected") {
      setToast("Google Calendar connected.");
      window.history.replaceState({}, "", "/");
    }
  }, [fetchEvents]);

  /* ---- Which entry is open on the desk, and what comes later ---- */
  const { desk, deskIsNow, later } = useMemo(() => {
    const live = events.filter((e) => e.status !== "pending" || true);

    const open = live
      .filter((e) => {
        const { start, end } = spanOf(e);
        return start <= today && today <= end;
      })
      .sort((a, b) => spanOf(a).start.getTime() - spanOf(b).start.getTime());

    const upcoming = live
      .filter((e) => spanOf(e).start > today)
      .sort((a, b) => spanOf(a).start.getTime() - spanOf(b).start.getTime());

    const deskEvent = open[0] ?? upcoming[0] ?? null;
    const isNow = open.length > 0;

    // Countdowns: remaining events + upcoming special dates, nearest first.
    const eventRows = upcoming
      .filter((e) => e.id !== deskEvent?.id)
      .map((e) => ({ id: e.id, title: e.title, days: daysBetween(today, spanOf(e).start), href: "/calendar" }));

    const specialRows = specialDates
      .filter((d) => d.daysLeft >= 0)
      .map((d) => ({ id: d.id, title: specialDateLabel(d), days: d.daysLeft, href: "/calendar" }));

    const rows = [...eventRows, ...specialRows]
      .sort((a, b) => a.days - b.days)
      .slice(0, 2);

    return { desk: deskEvent, deskIsNow: isNow, later: rows };
  }, [events, specialDates, today]);

  const deskCat = desk ? getCategoryById(desk.category) : null;
  const deskSpan = desk ? spanOf(desk) : null;
  const spanDays = deskSpan ? daysBetween(deskSpan.start, deskSpan.end) + 1 : 1;
  const dayOfSpan = deskSpan ? Math.min(spanDays, daysBetween(deskSpan.start, today) + 1) : 1;

  // Seeded on today's Muscat date, so the page turns once a day rather than
  // on every refresh — and both of them are shown the same one.
  const shelfEntry = useMemo(
    () => dailyPick(shelfEntries, today.toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" })),
    [shelfEntries, today],
  );

  const hijri = hijriOf(today);

  return (
    <AppShell active={null} fab={<Fab onClick={() => router.push("/entry/new")} />}>
      {/* ── 1. Header ── */}
      <header className="pt-5">
        <h1 className="rr-display" style={{ fontSize: 26, lineHeight: 1.15, color: "var(--ink)" }}>
          {spellDate(today)}
        </h1>
        <p className="rr-meta mt-2">
          {vol.together} together
          {hijri && <span style={{ color: "var(--faint)" }}> · {hijri}</span>}
        </p>
      </header>

      {loading || sessionLoading ? (
        <div className="mt-8 flex flex-col gap-4">
          <Skeleton className="h-52" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <>
          {/* ── 2. Open on the desk ── */}
          <section className="mt-7">
            {desk && deskCat && deskSpan ? (
              <div className="rr-double">
                <div>
                  <div className="flex items-center gap-2">
                    <BookGlyph size={18} />
                    <span className="rr-label" style={{ color: "var(--terracotta)" }}>
                      {deskIsNow ? "Open on the desk" : "Next in the volume"}
                    </span>
                  </div>

                  <button
                    onClick={() => setSheetEvent(desk)}
                    className="block text-left w-full mt-3"
                  >
                    <h2 className="rr-display" style={{ fontSize: 34, lineHeight: 1.08, color: "var(--ink)" }}>
                      {desk.title}
                    </h2>
                  </button>

                  <p className="rr-italic mt-2" style={{ fontSize: 15, color: "var(--muted)" }}>
                    {spanDays > 1
                      ? `${spellDate(deskSpan.start, { weekday: false })} — ${spellDate(deskSpan.end, { weekday: false })}`
                      : spellDate(deskSpan.start)}
                    {" · "}{deskCat.label}
                  </p>

                  <p className="rr-meta mt-4">
                    Cat. no. {catalogueNumber(deskSpan.start)}
                    {spanDays > 1 && ` — ${dayOfSpan} of ${spanDays} days`}
                  </p>

                  <div className="rr-hairline mt-5 pt-4 flex items-center gap-5">
                    <button className="rr-action" onClick={() => setSheetEvent(desk)}>
                      Margin notes
                    </button>
                    <button
                      className="rr-action"
                      onClick={() => setBindTarget({
                        event: { id: desk.id, title: desk.title, category: desk.category ?? null },
                        daysAgo: Math.max(0, daysBetween(deskSpan.start, today)),
                      })}
                    >
                      Photograph
                    </button>
                    <button
                      className="rr-action rr-action-danger ml-auto"
                      onClick={() => setBindTarget({
                        event: { id: desk.id, title: desk.title, category: desk.category ?? null },
                        daysAgo: Math.max(0, daysBetween(deskSpan.start, today)),
                      })}
                    >
                      Bind it
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rr-double">
                <div>
                  <div className="flex items-center gap-2">
                    <BookGlyph size={18} />
                    <span className="rr-label" style={{ color: "var(--terracotta)" }}>Open on the desk</span>
                  </div>
                  <p className="rr-italic mt-4" style={{ fontSize: 20, color: "var(--ghost)" }}>
                    nothing is open — the rest of the page is blank
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ── 3. Later in the volume ── */}
          {later.length > 0 && (
            <section className="mt-9">
              <p className="rr-label">Later in the volume</p>
              <div className="mt-3">
                {later.map((row) => (
                  <Link
                    key={row.id}
                    href={row.href}
                    className="rr-dotted flex items-baseline justify-between gap-4 py-4"
                  >
                    <span className="rr-display" style={{ fontSize: 20, color: "var(--ink)" }}>
                      {row.title}
                    </span>
                    <span style={{ fontSize: 12.5, color: "var(--muted)", flex: "none" }}>
                      {row.days === 0 ? "today" : row.days === 1 ? "1 day" : `${row.days} days`}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── 4. Reopened today — a different page each morning ── */}
          {shelfEntry && (
            <section className="mt-9">
              <p className="rr-label">Reopened today</p>
              <Link href="/story" className="block mt-3 rr-frame">
                {shelfEntry.photo ? (
                  <img src={shelfEntry.photo} alt="" style={{ aspectRatio: "4 / 3" }} />
                ) : (
                  <div style={{ aspectRatio: "4 / 3", background: "var(--wash)" }} />
                )}
                <div className="flex items-stretch gap-3 pt-3">
                  <div className="flex-1 min-w-0">
                    <p className="rr-display" style={{ fontSize: 20, lineHeight: 1.2, color: "var(--ink)" }}>
                      {shelfEntry.title.length > 90 ? shelfEntry.title.slice(0, 90) + "…" : shelfEntry.title}
                    </p>
                    <p className="rr-italic mt-1" style={{ fontSize: 14, color: "var(--muted)" }}>
                      {spellDate(dayStart(shelfEntry.date), { weekday: false })}
                      {" · "}{shelfEntry.categoryLabel}
                    </p>
                  </div>
                  {/* stamped margin: the date stacked vertically */}
                  <div
                    className="flex flex-col items-center justify-center"
                    style={{ width: 38, borderLeft: "1px solid var(--rule-light)", flex: "none" }}
                  >
                    {catalogueNumber(dayStart(shelfEntry.date)).split("·").map((part, i) => (
                      <span key={i} className="rr-meta" style={{ fontSize: 10, letterSpacing: ".1em" }}>
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </section>
          )}
        </>
      )}

      <EntrySheet
        event={sheetEvent}
        onClose={() => setSheetEvent(null)}
        onChanged={fetchEvents}
        onBind={(e) => setBindTarget({
          event: { id: e.id, title: e.title, category: e.category ?? null },
          daysAgo: Math.max(0, daysBetween(spanOf(e).start, today)),
        })}
      />

      <SaveMemoryModal
        isOpen={!!bindTarget}
        onClose={() => setBindTarget(null)}
        onSuccess={() => { setBindTarget(null); setToast("Bound into the volume."); fetchEvents(); }}
        pending={bindTarget}
      />

      <Toast message={toast || ""} isVisible={toast !== null} onClose={() => setToast(null)} />
      <PushPrompt />
    </AppShell>
  );
}
