"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import ThemeGlyph from "./ThemeGlyph";
import { useTheme } from "./ThemeProvider";
import { useSession, useNames, usePerson } from "./SessionProvider";
import { getCategoryById } from "@/lib/categories";
import { spellDate, spellTime, catalogueNumber } from "@/lib/volume";
import type { CalendarEvent } from "@/lib/types";

const TZ = "+04:00";

function dayStart(iso: string) {
  return new Date(`${iso.split("T")[0]}T00:00:00${TZ}`);
}

/** A label/value row with a 74px uppercase label column. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3" style={{ borderTop: "1px solid var(--rule-light)" }}>
      <span className="rr-label" style={{ width: 74, flex: "none", paddingTop: 3 }}>{label}</span>
      <div className="flex-1 min-w-0" style={{ fontSize: 15, color: "var(--ink)" }}>{children}</div>
    </div>
  );
}

export default function EntrySheet({
  event,
  onClose,
  onChanged,
  onBind,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onChanged?: () => void;
  onBind?: (e: CalendarEvent) => void;
}) {
  const router = useRouter();
  const { user } = useSession();
  const { theme, definition } = useTheme();
  const w = definition.words;
  const displayName = useNames();
  const lookupPerson = usePerson();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const act = async (action: string) => {
    if (!event) return;
    setBusy(action);
    try {
      await fetch("/api/events/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action, eventId: event.id, user }),
      });
      onChanged?.();
      onClose();
    } catch { /* ignore */ }
    finally { setBusy(null); setConfirmWithdraw(false); }
  };

  const cat = event ? getCategoryById(event.category) : null;
  const person = event ? lookupPerson(event.personTag) : null;
  const start = event ? dayStart(event.date as string) : null;
  const end = event?.endDate ? dayStart(event.endDate as string) : null;
  const isPending = event?.status === "pending";
  const stamp = event?.archived
    ? "Archived"
    : isPending ? "Awaiting" : event?.status === "adjusted" ? "Amended" : "Accepted";

  return (
    <AnimatePresence>
      {event && cat && start && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "color-mix(in srgb, var(--green-darkest) 62%, transparent)" }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.24, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            style={{ background: "var(--paper)", borderTop: "1px solid var(--rule-strong)", boxShadow: "var(--sheet-shadow)" }}
          >
            <div className="mx-auto w-full" style={{ maxWidth: 640 }}>
              {/* Grab handle */}
              <div className="flex justify-center pt-3 pb-5">
                <button onClick={onClose} aria-label="Close" style={{ width: 44, height: 3, background: "var(--rule-strong)" }} />
              </div>

              <div className="px-[22px] pb-10">
                {/* The framed card. Reading Room frames it as a title page
                    with a double rule; the round themes use their own card. */}
                <div className={theme === "reading-room" ? "rr-double" : "rr-card"}>
                  <div style={theme === "reading-room" ? undefined : { padding: 20 }}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="rr-meta">{w.refPrefix} {catalogueNumber(start)}</span>
                      <span className="rr-stamp">{stamp}</span>
                    </div>

                    <h2 className="rr-display mt-4" style={{ fontSize: 29, lineHeight: 1.1, color: "var(--ink)" }}>
                      {event.title}
                    </h2>
                    <p className="rr-italic mt-1.5" style={{ fontSize: 15, color: "var(--muted)" }}>
                      {cat.label} — entered by {displayName(event.createdBy)}
                    </p>

                    <div className="mt-5">
                      <Row label="When">
                        {end
                          ? `${spellDate(start)} — ${spellDate(end)}`
                          : spellDate(start)}
                        {event.allDay
                          ? <span style={{ color: "var(--muted)" }}> · all day</span>
                          : <span style={{ color: "var(--muted)" }}> · {spellTime(event.time)}{event.endTime ? `–${spellTime(event.endTime)}` : ""}</span>}
                      </Row>
                      {person && <Row label="Attending">{person.label}</Row>}
                    </div>
                  </div>
                </div>

                {/* The note, as a pull-quote on the theme's accent rule */}
                {event.notes && (
                  <blockquote className="rr-quote mt-6" style={{ fontSize: 18, lineHeight: 1.5 }}>
                    {event.notes}
                  </blockquote>
                )}

                {/* Primary action */}
                {isPending && event.createdBy !== user ? (
                  <button
                    className="rr-btn w-full mt-7 justify-center flex items-center gap-3"
                    onClick={() => act("accept")}
                    disabled={busy !== null}
                  >
                    {busy === "accept" ? "Accepting…" : "Accept the entry"}
                  </button>
                ) : (
                  <button
                    className="rr-btn w-full mt-7 justify-center flex items-center gap-3"
                    onClick={() => { onBind?.(event); onClose(); }}
                  >
                    <ThemeGlyph
                      name={theme === "observatory" ? "star" : theme === "coffee" ? "cup" : "book"}
                      size={16}
                    />
                    {w.keepAction === "Bind it" ? "Bind as a memory"
                      : w.keepAction === "Keep it" ? "Keep as a memory"
                      : "Log as an observation"}
                  </button>
                )}

                {/* Text actions */}
                <div className="flex items-center justify-center gap-6 mt-6">
                  <button
                    className="rr-action"
                    onClick={() => { onClose(); router.push(`/entry/new?id=${event.id}`); }}
                  >
                    Amend
                  </button>
                  <button
                    className="rr-action"
                    onClick={() => act(event.archived ? "unarchive" : "archive")}
                    disabled={busy !== null}
                  >
                    {event.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    className="rr-action rr-action-danger"
                    onClick={() => (confirmWithdraw ? act("delete") : setConfirmWithdraw(true))}
                    disabled={busy !== null}
                  >
                    {confirmWithdraw ? "Tap again to withdraw" : "Withdraw"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
