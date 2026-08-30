"use client";

import { useState, useEffect, useMemo } from "react";
import AppShell, { Fab } from "@/components/AppShell";
import Skeleton from "@/components/Skeleton";
import { usePeople, usePerson, useSession, useNames } from "@/components/SessionProvider";
import { FREQUENCIES, FREQUENCY_LABELS, bucketFor, type Frequency } from "@/lib/tasks";
import { WEEKDAY_NAMES } from "@/lib/week";

interface Task {
  id: string;
  title: string;
  notes: string | null;
  personTag: string | null;
  dueDate: string | null;
  completed: boolean;
  completedBy: string | null;
  createdBy: string;
  seriesId: string | null;
}
interface Series {
  id: string; title: string; personTag: string | null;
  frequency: string; weekday: number | null; monthDay: number | null;
}

const BUCKET_LABELS = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Coming up",
  someday: "No particular day",
} as const;
const ORDER = ["overdue", "today", "upcoming", "someday"] as const;

const isoToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });

/** "3 days ago", "today", "Tuesday", "Tue 8 Sep" — never a raw ISO date. */
function relativeDay(dueIso: string, now: Date): string {
  const due = new Date(dueIso);
  const days = Math.round(
    (Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) - now.getTime()) / 86_400_000,
  );
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  // Within the week a weekday name is easier to place than a date.
  if (days <= 6) return due.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  return due.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export default function LedgerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [filterPerson, setFilterPerson] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // The add form
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [personTag, setPersonTag] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [frequency, setFrequency] = useState<Frequency | "">("");
  const [weekday, setWeekday] = useState(0);
  const [monthDay, setMonthDay] = useState(1);
  const [saving, setSaving] = useState(false);

  const people = usePeople();
  const personOf = usePerson();
  const names = useNames();
  const { user } = useSession();

  const load = () =>
    fetch("/api/tasks", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.tasks)) setTasks(d.tasks);
        if (Array.isArray(d?.series)) setSeries(d.series);
      })
      .catch(() => setError("Could not load the ledger."))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const reset = () => {
    setTitle(""); setNotes(""); setPersonTag(null); setDueDate("");
    setFrequency(""); setWeekday(0); setMonthDay(1);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title, notes: notes || null, personTag, dueDate: dueDate || null,
          ...(frequency ? { frequency, weekday, monthDay } : {}),
        }),
      });
      if (!res.ok) { setError("Could not add that."); return; }
      reset();
      setAdding(false);
      await load();
    } finally { setSaving(false); }
  };

  const toggle = async (task: Task) => {
    // Move it straight away; the list re-reads underneath.
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ completed: !task.completed }),
    }).catch(() => {});
    await load();
  };

  const remove = async (task: Task) => {
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE", credentials: "same-origin" }).catch(() => {});
    await load();
  };

  const stopSeries = async (id: string) => {
    await fetch(`/api/tasks/series/${id}`, { method: "DELETE", credentials: "same-origin" }).catch(() => {});
    await load();
  };

  /** Is this task pointed at the person reading the page, specifically? */
  const mine = (t: Task) =>
    (t.personTag === "wife" && user === "Wife") ||
    (t.personTag === "husband" && user === "Husband");

  const now = useMemo(() => new Date(`${isoToday()}T00:00:00.000Z`), []);
  const visible = tasks
    .filter((t) => t.completed === showDone)
    .filter((t) => !filterPerson || t.personTag === filterPerson);

  const grouped = ORDER.map((key) => ({
    key,
    items: visible.filter((t) => bucketFor(t.dueDate ? new Date(t.dueDate) : null, now) === key),
  })).filter((g) => g.items.length > 0);

  const open = tasks.filter((t) => !t.completed);
  const overdueCount = open.filter(
    (t) => bucketFor(t.dueDate ? new Date(t.dueDate) : null, now) === "overdue",
  ).length;

  return (
    <AppShell active="ledger" fab={<Fab onClick={() => setAdding((v) => !v)} />}>
      <header className="pt-5">
        <h1 className="rr-display" style={{ fontSize: 26, color: "var(--ink)" }}>The Ledger</h1>
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          {open.length === 0 ? (
            "nothing outstanding"
          ) : (
            <>
              {open.length} outstanding
              {overdueCount > 0 && (
                <span style={{ color: "var(--terracotta)" }}>{`, ${overdueCount} overdue`}</span>
              )}
            </>
          )}
        </p>
      </header>

      {/* Add */}
      {adding && (
        <form onSubmit={add} className="mt-6 rr-card p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="what needs doing"
            className="rr-display w-full"
            style={{ fontSize: 19 }}
            autoFocus
          />

          <div className="mt-4">
            <p className="rr-label" style={{ fontSize: 9.5 }}>For</p>
            <div className="flex flex-wrap gap-2.5 mt-2">
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="rr-btn-quiet"
                  onClick={() => setPersonTag(personTag === p.id ? null : p.id)}
                  style={
                    personTag === p.id
                      ? { background: "var(--terracotta)", color: "var(--on-dark)", borderColor: "var(--terracotta)" }
                      : undefined
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-5">
            <div>
              <p className="rr-label" style={{ fontSize: 9.5 }}>Due (optional)</p>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ fontSize: 15 }} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <p className="rr-label" style={{ fontSize: 9.5 }}>Repeats</p>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency | "")}
                style={{ fontSize: 15, width: "100%" }}
              >
                <option value="">Just once</option>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                ))}
              </select>
            </div>
          </div>

          {(frequency === "weekly" || frequency === "fortnightly") && (
            <div className="mt-3">
              <p className="rr-label" style={{ fontSize: 9.5 }}>On</p>
              <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} style={{ fontSize: 15 }}>
                {WEEKDAY_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
              </select>
            </div>
          )}
          {frequency === "monthly" && (
            <div className="mt-3">
              <p className="rr-label" style={{ fontSize: 9.5 }}>Day of the month</p>
              <input
                type="number" min={1} max={31} value={monthDay}
                onChange={(e) => setMonthDay(Number(e.target.value))}
                style={{ fontSize: 15, width: 80 }}
              />
              <span className="rr-italic ml-3" style={{ fontSize: 13, color: "var(--faint)" }}>
                short months fall back to their last day
              </span>
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="anything worth remembering"
            rows={2}
            className="w-full mt-4"
            style={{ fontSize: 15 }}
          />

          <div className="flex items-center gap-4 mt-4">
            <button className="rr-btn" type="submit" disabled={saving || !title.trim()}>
              {saving ? "Adding…" : "Add to the ledger"}
            </button>
            <button type="button" className="rr-action" style={{ fontSize: 12 }}
              onClick={() => { reset(); setAdding(false); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-4" style={{ fontSize: 13, color: "var(--terracotta)" }}>{error}</p>}

      {/* Two different kinds of filter, so two rows rather than one run-on
          line where the last name gets cut in half. */}
      <div className="flex mt-6" style={{ border: "1px solid var(--rule)", width: "fit-content" }}>
        {([false, true] as const).map((done) => (
          <button
            key={String(done)}
            onClick={() => setShowDone(done)}
            className="rr-meta"
            style={{
              fontSize: 10, letterSpacing: ".14em", padding: "7px 15px",
              background: showDone === done ? "var(--green-deep)" : "transparent",
              color: showDone === done ? "var(--paper)" : "var(--muted)",
            }}
          >
            {done ? "SETTLED" : "OUTSTANDING"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3 overflow-x-auto no-scrollbar">
        <button className="rr-filter whitespace-nowrap" data-active={!filterPerson} onClick={() => setFilterPerson(null)}>
          Everyone
        </button>
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

      {loading ? (
        <div className="mt-6"><Skeleton className="h-40" /></div>
      ) : grouped.length === 0 ? (
        <p className="rr-italic mt-12 text-center" style={{ fontSize: 17, color: "var(--ghost)" }}>
          {showDone
            ? "nothing settled yet"
            : filterPerson
              ? "nothing outstanding for them"
              : "the page is clear"}
        </p>
      ) : (
        grouped.map((group) => (
          <section key={group.key} className="mt-6">
            <p
              className="rr-label"
              style={{
                fontSize: 9.5,
                color: group.key === "overdue" ? "var(--terracotta)" : "var(--faint)",
              }}
            >
              {BUCKET_LABELS[group.key]}
              <span style={{ marginLeft: 8, color: "var(--ghost)" }}>{group.items.length}</span>
            </p>

            <div className="mt-1.5" style={{ borderTop: "1px solid var(--rule)" }}>
              {group.items.map((t) => {
                const person = personOf(t.personTag);
                const overdue = group.key === "overdue";
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2"
                    style={{
                      borderBottom: "1px solid var(--rule-light)",
                      // Overdue gets a mark in the margin rather than a colour
                      // wash — a whole screen of red reads as an alarm, and
                      // then nothing on it reads as urgent.
                      borderLeft: `2px solid ${overdue ? "var(--terracotta)" : "transparent"}`,
                      paddingLeft: 8,
                    }}
                  >
                    <button
                      onClick={() => toggle(t)}
                      aria-label={t.completed ? `Put ${t.title} back` : `Tick off ${t.title}`}
                      className="flex items-center justify-center"
                      // Small mark, generous target: 44px is the smallest thing
                      // a thumb hits reliably.
                      style={{ flex: "none", width: 32, height: 46 }}
                    >
                      <span
                        style={{
                          display: "block", width: 15, height: 15,
                          border: `1px solid ${t.completed ? "var(--gold)" : "var(--rule-strong)"}`,
                          background: t.completed ? "var(--gold)" : "transparent",
                        }}
                      />
                    </button>

                    <div className="flex-1 min-w-0 py-2.5">
                      <p
                        className="rr-italic"
                        style={{
                          fontSize: 16, lineHeight: 1.3,
                          color: t.completed ? "var(--faint)" : "var(--ink)",
                          textDecoration: t.completed ? "line-through" : undefined,
                        }}
                      >
                        {t.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {person && (
                          // Every person tag resolves to the same tint, so a
                          // coloured chip would say nothing. What is actually
                          // worth seeing at a glance is whether it is yours.
                          <span
                            className="rr-meta"
                            style={{
                              fontSize: 10, whiteSpace: "nowrap",
                              color: mine(t) ? "var(--terracotta)" : "var(--faint)",
                            }}
                          >
                            {person.label.toUpperCase()}
                          </span>
                        )}
                        {t.dueDate && !t.completed && (
                          <span
                            style={{ fontSize: 12.5, color: overdue ? "var(--terracotta)" : "var(--muted)" }}
                          >
                            {relativeDay(t.dueDate, now)}
                          </span>
                        )}
                        {t.completed && t.completedBy && (
                          <span style={{ fontSize: 12.5, color: "var(--faint)" }}>
                            settled by {names(t.completedBy)}
                          </span>
                        )}
                        {t.seriesId && (
                          <span title="Repeats" aria-label="Repeats"
                            style={{ fontSize: 13, color: "var(--sage)" }}>↻</span>
                        )}
                      </div>

                      {t.notes && (
                        <p className="mt-1" style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.4 }}>
                          {t.notes}
                        </p>
                      )}
                    </div>

                    {/* Quiet on purpose. It sat on every row as an underlined
                        "Remove", competing with the tasks for attention. */}
                    <button
                      onClick={() => remove(t)}
                      aria-label={`Remove ${t.title}`}
                      className="flex items-center justify-center"
                      style={{ flex: "none", width: 34, height: 46, color: "var(--ghost)", fontSize: 18 }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* Standing chores */}
      {series.length > 0 && (
        <section className="mt-10 pt-6" style={{ borderTop: "1px solid var(--rule)" }}>
          <p className="rr-label">Standing chores</p>
          <p className="rr-italic mt-1" style={{ fontSize: 14, color: "var(--muted)" }}>
            each puts a single entry in the ledger; finishing it writes the next.
          </p>
          <div className="mt-3">
            {series.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 py-2.5"
                style={{ borderTop: "1px solid var(--rule-light)" }}>
                <span className="rr-italic" style={{ fontSize: 15.5, color: "var(--ink)" }}>
                  {s.title}
                  <span className="rr-meta ml-3" style={{ fontSize: 10, color: "var(--faint)" }}>
                    {FREQUENCY_LABELS[s.frequency as Frequency] ?? s.frequency}
                    {(s.frequency === "weekly" || s.frequency === "fortnightly") && s.weekday !== null
                      ? ` · ${WEEKDAY_NAMES[s.weekday]}`
                      : s.frequency === "monthly" && s.monthDay !== null
                        ? ` · day ${s.monthDay}`
                        : ""}
                  </span>
                </span>
                <button className="rr-action" style={{ flex: "none", fontSize: 11 }} onClick={() => stopSeries(s.id)}>
                  Stop
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Clear of the floating add button and the nav bubble. */}
      <div style={{ height: 96 }} />
    </AppShell>
  );
}
