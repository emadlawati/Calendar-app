"use client";

import { useState, useEffect, useMemo } from "react";
import AppShell, { Fab } from "@/components/AppShell";
import Skeleton from "@/components/Skeleton";
import { usePeople, usePerson, useSession } from "@/components/SessionProvider";
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

  const now = useMemo(() => new Date(`${isoToday()}T00:00:00.000Z`), []);
  const visible = tasks
    .filter((t) => t.completed === showDone)
    .filter((t) => !filterPerson || t.personTag === filterPerson);

  const grouped = ORDER.map((key) => ({
    key,
    items: visible.filter((t) => bucketFor(t.dueDate ? new Date(t.dueDate) : null, now) === key),
  })).filter((g) => g.items.length > 0);

  const openCount = tasks.filter((t) => !t.completed).length;
  const overdue = tasks.filter(
    (t) => !t.completed && bucketFor(t.dueDate ? new Date(t.dueDate) : null, now) === "overdue",
  ).length;

  return (
    <AppShell active="ledger" fab={<Fab onClick={() => setAdding((v) => !v)} />}>
      <header className="pt-5">
        <h1 className="rr-display" style={{ fontSize: 26, color: "var(--ink)" }}>The Ledger</h1>
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          {openCount === 0
            ? "nothing outstanding"
            : `${openCount} outstanding${overdue > 0 ? `, ${overdue} overdue` : ""}`}
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
                      ? { background: "var(--terracotta)", color: "var(--paper)", borderColor: "var(--terracotta)" }
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

      {/* Filters */}
      <div className="flex items-center gap-5 mt-6 overflow-x-auto no-scrollbar">
        <button className="rr-filter whitespace-nowrap" data-active={!showDone} onClick={() => setShowDone(false)}>
          Outstanding
        </button>
        <button className="rr-filter whitespace-nowrap" data-active={showDone} onClick={() => setShowDone(true)}>
          Settled
        </button>
        <span style={{ color: "var(--rule-strong)" }}>·</span>
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
        <p className="rr-italic mt-10 text-center" style={{ fontSize: 17, color: "var(--ghost)" }}>
          {showDone ? "nothing settled yet" : "the page is clear"}
        </p>
      ) : (
        grouped.map((group) => (
          <section key={group.key} className="mt-7">
            <p
              className="rr-label"
              style={{ color: group.key === "overdue" ? "var(--terracotta)" : undefined }}
            >
              {BUCKET_LABELS[group.key]}
            </p>
            <div className="mt-2">
              {group.items.map((t) => {
                const person = personOf(t.personTag);
                return (
                  <div
                    key={t.id}
                    className="flex items-start gap-3 py-3"
                    style={{ borderTop: "1px solid var(--rule-light)" }}
                  >
                    <button
                      onClick={() => toggle(t)}
                      aria-label={t.completed ? "Put back" : "Tick off"}
                      style={{
                        flex: "none", width: 17, height: 17, marginTop: 4,
                        border: `1px solid ${t.completed ? "var(--gold)" : "var(--rule-strong)"}`,
                        background: t.completed ? "var(--gold)" : "transparent",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="rr-italic"
                        style={{
                          fontSize: 16,
                          color: t.completed ? "var(--faint)" : "var(--ink)",
                          textDecoration: t.completed ? "line-through" : undefined,
                        }}
                      >
                        {t.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {person && (
                          <span className="rr-meta" style={{ fontSize: 10, color: "var(--faint)" }}>
                            {person.label.toUpperCase()}
                          </span>
                        )}
                        {t.dueDate && (
                          <span className="rr-meta" style={{ fontSize: 10, color: "var(--faint)" }}>
                            {new Date(t.dueDate).toISOString().slice(0, 10)}
                          </span>
                        )}
                        {t.seriesId && (
                          <span className="rr-meta" style={{ fontSize: 10, color: "var(--sage)" }}>REPEATS</span>
                        )}
                      </div>
                      {t.notes && (
                        <p className="mt-1" style={{ fontSize: 13, color: "var(--muted)" }}>{t.notes}</p>
                      )}
                    </div>
                    <button className="rr-action" style={{ flex: "none", fontSize: 11 }} onClick={() => remove(t)}>
                      Remove
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
            each one puts a single entry in the ledger; finishing it writes the next.
          </p>
          <div className="mt-3">
            {series.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 py-2.5"
                style={{ borderTop: "1px solid var(--rule-light)" }}>
                <span style={{ fontSize: 14.5, color: "var(--ink)" }}>
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

      <p className="rr-italic text-center mt-10" style={{ fontSize: 15, color: "var(--ghost)" }}>
        {user ? "what is owed, and what is settled" : ""}
      </p>
    </AppShell>
  );
}
