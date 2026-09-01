"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import { usePartnerName } from "./SessionProvider";
import ThemeGlyph, { type GlyphName } from "./ThemeGlyph";
import type { ThemeWords } from "@/lib/themes";

/**
 * The first-run walkthrough.
 *
 * A family arriving on an invitation lands on an empty app with seven
 * destinations and no idea which of them matters. This walks through them
 * once, in the theme's own words, and then gets out of the way.
 *
 * Deliberately a stepped card rather than tooltips pinned to elements: the
 * sections live on seven different routes, so anchored callouts would mean
 * driving the router around while measuring a moving layout. A card that names
 * each section and says what it is for survives a phone, a rotation and a
 * half-loaded page, which pinned bubbles do not.
 *
 * Seen-ness lives in localStorage rather than the database. It is a per-person,
 * per-device convenience, not shared family state, and a new sign-in showing
 * the tour again is the harmless direction for it to fail in. Settings has a
 * button to run it again on purpose.
 */

const KEY = "walkthrough-seen-v1";

/** Whether this person, on this device, has been through it. */
export function hasSeenWalkthrough(userKey: string): boolean {
  try {
    return localStorage.getItem(`${KEY}:${userKey}`) === "1";
  } catch {
    // Private mode, or storage disabled. Better to skip the tour than to
    // block the app behind a storage error.
    return true;
  }
}

export function markWalkthroughSeen(userKey: string) {
  try { localStorage.setItem(`${KEY}:${userKey}`, "1"); } catch { /* nothing to do */ }
}

export function clearWalkthroughSeen(userKey: string) {
  try { localStorage.removeItem(`${KEY}:${userKey}`); } catch { /* nothing to do */ }
}

interface Step {
  glyph: GlyphName;
  label: string;
  title: string;
  body: string;
}

/**
 * The steps, named by the theme. Only the section names and two lines of
 * flavour change between themes — the explanations are the same because what
 * the sections *do* is the same.
 */
function stepsFor(w: ThemeWords, theme: string, partner: string): Step[] {
  const g: GlyphName = theme === "observatory" ? "star" : theme === "coffee" ? "cup" : "book";
  const g2: GlyphName = theme === "observatory" ? "crescent" : theme === "coffee" ? "bean" : "book";
  const g3: GlyphName = theme === "observatory" ? "planet" : theme === "coffee" ? "cup" : "book";

  return [
    {
      glyph: g,
      label: "Yours only",
      title: "This is just for your family",
      body:
        `Nobody outside it can see a thing here — not other families, not the people who sent you the link. ` +
        `Everything you write is kept for the two of you${partner ? ` and ${partner}` : ""}.`,
    },
    {
      glyph: g,
      label: "Home",
      title: "What is happening now",
      body:
        `The big card at the top is whatever is on today, or the next thing coming. ` +
        `Underneath it: what is approaching, and the last thing you kept.`,
    },
    {
      glyph: g3,
      label: w.calendar,
      title: "The month at a glance",
      body:
        `A dot under a day means something is on. Tap any day to see it. ` +
        `The button at the bottom right adds something new.`,
    },
    {
      glyph: g2,
      label: "Our Story",
      title: "What you decide to keep",
      body:
        `Anything on the calendar can be kept as a memory, with photographs and a note. ` +
        `Memories is the picture feed; Timeline is the same thing as a list, oldest first.`,
    },
    {
      glyph: g2,
      label: "Letters",
      title: "Notes to each other",
      body:
        `Short letters and appreciations. They stay here rather than getting lost in a chat. ` +
        `${partner || "Your partner"} is told when you leave one.`,
    },
    {
      glyph: g3,
      label: "The Ledger",
      title: "Things that need doing",
      body:
        `A shared list. Give a task to either of you, add a date if it has one, ` +
        `and repeat the ones that come round every week.`,
    },
    {
      glyph: g,
      label: w.shelf,
      title: "The record, not a score",
      body:
        `How much you have kept, and the milestones you have passed. ` +
        `${w.closing.replace(/^no points, no levels — /, "There are no points and no levels — ")}.`,
    },
    {
      glyph: g2,
      label: w.wishlist,
      title: "Things for one day",
      body:
        `Somewhere to put an idea with no date on it yet. When it gets one, ` +
        `it becomes an entry on the calendar.`,
    },
    {
      glyph: g,
      label: "Settings",
      title: "Two things worth doing now",
      body:
        `Turn on notifications so reminders reach your phone, and add the app to your home screen. ` +
        `You can also change how all of this looks — there are three to choose from.`,
    },
  ];
}

export default function Walkthrough({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme, definition } = useTheme();
  const partner = usePartnerName();
  const [i, setI] = useState(0);

  const steps = stepsFor(definition.words, theme, partner);
  const last = i === steps.length - 1;

  const close = useCallback(() => { setI(0); onClose(); }, [onClose]);

  // Escape closes it, like every other overlay in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const step = steps[i];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60]"
            style={{ background: "color-mix(in srgb, var(--green-darkest) 66%, transparent)" }}
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-[61] px-[18px] pb-[18px]"
            role="dialog"
            aria-modal="true"
            aria-label="Walkthrough"
          >
            <div
              className="mx-auto"
              style={{
                maxWidth: 460,
                background: "var(--card)",
                border: "1px solid var(--rule-strong)",
                borderRadius: "var(--radius-card, 0)",
                boxShadow: "var(--sheet-shadow)",
                padding: 22,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <ThemeGlyph name={step.glyph} size={15} style={{ color: "var(--terracotta)" }} />
                  <span className="rr-label" style={{ color: "var(--terracotta)" }}>{step.label}</span>
                </span>
                <button className="rr-action" onClick={close} style={{ flex: "none" }}>
                  {last ? "Done" : "Skip"}
                </button>
              </div>

              <h2 className="rr-display mt-3" style={{ fontSize: 24, lineHeight: 1.15, color: "var(--ink)" }}>
                {step.title}
              </h2>
              <p className="mt-2.5" style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--muted)" }}>
                {step.body}
              </p>

              <div className="flex items-center justify-between gap-4 mt-6">
                {/* Where you are, without a number to count down. */}
                <span className="flex items-center gap-1.5" aria-hidden>
                  {steps.map((_, n) => (
                    <span key={n} style={{
                      width: n === i ? 16 : 5, height: 5, borderRadius: "999px",
                      background: n === i ? "var(--terracotta)"
                        : n < i ? "var(--rule-strong)" : "var(--rule-light)",
                      transition: "width .18s",
                    }} />
                  ))}
                </span>

                <span className="flex items-center gap-4" style={{ flex: "none" }}>
                  {i > 0 && (
                    <button className="rr-action" onClick={() => setI((n) => n - 1)}>Back</button>
                  )}
                  <button
                    className="rr-btn"
                    style={{ paddingLeft: 20, paddingRight: 20 }}
                    onClick={() => (last ? (close(), undefined) : setI((n) => n + 1))}
                  >
                    {last ? "Start" : "Next"}
                  </button>
                </span>
              </div>

              <p className="rr-meta mt-4" style={{ fontSize: 9.5 }}>
                Step {i + 1} of {steps.length} · you can run this again from Settings
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
