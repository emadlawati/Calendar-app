"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, useNames, usePartnerName, usePeople } from "@/components/SessionProvider";
import { EVENT_CATEGORIES } from "@/lib/categories";
import { specialDateLabel, linkableSpecialDates } from "@/lib/special-date-display";
import type { BucketItem, CalendarEvent, SpecialDateWithCountdown } from "@/lib/types";

const REPEATS = [
  { value: "once", label: "Once" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;
type Repeat = (typeof REPEATS)[number]["value"];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <p className="rr-label">{label}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function NewEntryForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useSession();
  const displayName = useNames();
  const partnerName = usePartnerName();
  const people = usePeople();

  const editId = params.get("id");
  const isEdit = !!editId;

  const [title, setTitle] = useState(params.get("title") || "");
  const [category, setCategory] = useState("other");
  const [date, setDate] = useState(params.get("date") || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" }));
  const [time, setTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("once");
  const [personTag, setPersonTag] = useState<string | null>(null);
  const [specialDateId, setSpecialDateId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [moreOpen, setMoreOpen] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);
  const [bucket, setBucket] = useState<BucketItem[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDateWithCountdown[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load the entry being amended
  useEffect(() => {
    if (!editId) return;
    fetch("/api/events", { cache: "no-store" })
      .then((r) => r.json())
      .then((list: CalendarEvent[]) => {
        const e = Array.isArray(list) ? list.find((x) => x.id === editId) : null;
        if (!e) return;
        setTitle(e.title);
        setCategory(e.category || "other");
        setDate((e.date as string).split("T")[0]);
        setEndDate(e.endDate ? (e.endDate as string).split("T")[0] : "");
        setTime(e.allDay ? "" : e.time || "");
        setEndTime(e.endTime || "");
        setAllDay(!!e.allDay);
        setPersonTag(e.personTag ?? null);
        setSpecialDateId(e.specialDateId ?? null);
        setNotes(e.notes || "");
        if (e.endDate || e.endTime || e.allDay || e.specialDateId) setMoreOpen(true);
      })
      .catch(() => {});
  }, [editId]);

  useEffect(() => {
    fetch("/api/special-dates").then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setSpecialDates(d); })
      .catch(() => {});
  }, []);

  const openReadingList = () => {
    setReadingOpen((v) => !v);
    if (bucket.length === 0) {
      fetch("/api/bucket").then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setBucket(d.filter((i: BucketItem) => !i.completed)); })
        .catch(() => {});
    }
  };
  const linkable = useMemo(() => linkableSpecialDates(specialDates), [specialDates]);

  const file = async () => {
    if (!title.trim()) { setError("An entry needs a title."); return; }
    if (endDate && endDate < date) { setError("The closing date falls before the opening one."); return; }
    setSaving(true);
    setError("");

    const payload = {
      title: title.trim(),
      date,
      endDate: repeat === "once" && endDate && endDate !== date ? endDate : undefined,
      time: allDay ? "00:00" : (time || "09:00"),
      endTime: allDay ? "23:59" : (endTime || undefined),
      notes,
      category,
      allDay,
      personTag: personTag || undefined,
      specialDateId: specialDateId || undefined,
      createdBy: user,
    };

    try {
      let res: Response;
      if (isEdit) {
        res = await fetch("/api/events/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            action: "edit",
            eventId: editId,
            user,
            title: payload.title,
            date: payload.date,
            endDate: payload.endDate ?? null,
            time: payload.time,
            endTime: payload.endTime ?? null,
            notes: payload.notes || null,
            category: payload.category,
            allDay: payload.allDay,
            personTag: personTag,
            specialDateId: specialDateId,
          }),
        });
      } else {
        res = await fetch(repeat === "once" ? "/api/events/create" : "/api/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(repeat === "once" ? payload : { ...payload, frequency: repeat }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "The entry could not be filed.");
        setSaving(false);
        return;
      }
      router.push("/calendar");
      router.refresh();
    } catch {
      setError("The entry could not be filed.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="mx-auto" style={{ maxWidth: 640 }}>
        <div className="px-[22px] pb-28">
          {/* Header row */}
          <div
            className="flex items-center justify-between gap-4 py-5"
            style={{ borderBottom: "1px solid var(--rule)" }}
          >
            <button className="rr-action" onClick={() => router.back()}>Discard</button>
            <span className="rr-display" style={{ fontSize: 17, color: "var(--ink)" }}>
              {isEdit ? "An amendment" : "A new entry"}
            </span>
            <button
              className="rr-action"
              style={{ color: "var(--terracotta)", fontWeight: 700 }}
              onClick={file}
              disabled={saving}
            >
              {saving ? "Filing…" : "File"}
            </button>
          </div>

          {/* Title */}
          <Section label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="an afternoon somewhere"
              className="rr-display"
              style={{ fontSize: 27, borderBottom: "1px solid var(--rule-strong)", padding: "6px 0" }}
            />
            {!isEdit && (
              <>
                <button
                  className="rr-italic mt-3 block"
                  style={{ fontSize: 15, color: "var(--terracotta)" }}
                  onClick={openReadingList}
                >
                  or take one from the reading list →
                </button>
                {readingOpen && (
                  <div className="mt-3 rr-card">
                    {bucket.length === 0 ? (
                      <p className="rr-italic p-4" style={{ fontSize: 15, color: "var(--ghost)" }}>
                        the reading list is empty
                      </p>
                    ) : bucket.slice(0, 8).map((item, i) => (
                      <button
                        key={item.id}
                        className="w-full text-left px-4 py-3 rr-display"
                        style={{
                          fontSize: 17,
                          color: "var(--ink)",
                          borderTop: i === 0 ? "none" : "1px solid var(--rule-light)",
                        }}
                        onClick={() => {
                          setTitle(item.title);
                          if (item.category) setCategory(item.category);
                          if (item.notes) setNotes(item.notes);
                          setReadingOpen(false);
                        }}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Section>

          {/* Subject */}
          <Section label="Subject">
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className="rr-chip"
                  data-selected={category === c.id}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Dated */}
          <Section label="Dated">
            <div className="flex gap-5">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onFocus={() => setMoreOpen(true)}
                className="rr-display"
                style={{ fontSize: 20, flex: 1 }}
              />
              {!allDay && (
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="time?"
                  className="rr-display"
                  style={{ fontSize: 20, width: 120 }}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-5 mt-4">
              {REPEATS.map((r) => (
                <button
                  key={r.value}
                  className="rr-filter"
                  data-active={repeat === r.value}
                  onClick={() => setRepeat(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Progressive extras */}
            {!moreOpen ? (
              <button className="rr-action mt-4" onClick={() => setMoreOpen(true)}>
                All day, a closing date, an occasion…
              </button>
            ) : (
              <div className="mt-5 rr-card p-4 flex flex-col gap-4">
                <label className="flex items-center gap-3" style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--green-deep)" }}
                  />
                  All day
                </label>

                {repeat === "once" && (
                  <div className="flex gap-5">
                    <div className="flex-1">
                      <p className="rr-label" style={{ fontSize: 9.5 }}>Closes</p>
                      <input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    {!allDay && (
                      <div style={{ width: 120 }}>
                        <p className="rr-label" style={{ fontSize: 9.5 }}>Until</p>
                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                      </div>
                    )}
                  </div>
                )}

                {linkable.length > 0 && (
                  <div>
                    <p className="rr-label" style={{ fontSize: 9.5 }}>Occasion</p>
                    <select
                      value={specialDateId ?? ""}
                      onChange={(e) => setSpecialDateId(e.target.value || null)}
                    >
                      <option value="">None</option>
                      {linkable.map((sd) => (
                        <option key={sd.id} value={sd.id}>{specialDateLabel(sd)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Attending */}
          <Section label="Attending">
            <div className="flex flex-wrap gap-2">
              {people.map((p) => {
                const on = personTag === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPersonTag(on ? null : p.id)}
                    className="rr-display px-4"
                    style={{
                      fontSize: 17,
                      minHeight: 44,
                      color: "var(--ink)",
                      background: on ? "var(--tint)" : "transparent",
                      border: on ? "1.5px solid var(--green-deep)" : "1px solid var(--rule-strong)",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Marginalia */}
          <Section label="Marginalia">
            <div className="rr-field">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="anything worth remembering…"
                style={{ resize: "vertical", minHeight: 72 }}
              />
            </div>
          </Section>

          {error && (
            <p className="rr-italic mt-5" style={{ fontSize: 15, color: "var(--terracotta)" }}>{error}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 mt-9">
            <span className="rr-italic" style={{ fontSize: 15, color: "var(--muted)" }}>
              {personTag === "wife" || personTag === "husband"
                ? `${displayName(personTag === "wife" ? "Wife" : "Husband")} will be told`
                : `${partnerName} will be told`}
            </span>
            <button className="rr-btn" onClick={file} disabled={saving} style={{ flex: "none" }}>
              {saving ? "Filing…" : isEdit ? "Save it" : "File it"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewEntryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--paper)" }} />}>
      <NewEntryForm />
    </Suspense>
  );
}
