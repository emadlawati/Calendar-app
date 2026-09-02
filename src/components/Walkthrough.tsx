"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import { usePartnerName, useSession } from "./SessionProvider";
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
  /** Renders the partner-invitation panel under the text. */
  invite?: boolean;
}

/**
 * The steps, named by the theme. Only the section names and two lines of
 * flavour change between themes — the explanations are the same because what
 * the sections *do* is the same.
 */
function stepsFor(w: ThemeWords, theme: string, partner: string, seatFree: boolean): Step[] {
  const g: GlyphName = theme === "observatory" ? "star" : theme === "coffee" ? "cup" : "book";
  const g2: GlyphName = theme === "observatory" ? "crescent" : theme === "coffee" ? "bean" : "book";
  const g3: GlyphName = theme === "observatory" ? "planet" : theme === "coffee" ? "cup" : "book";

  return [
    // First, and only while the other seat is empty. Bringing your partner in
    // is the one thing the app cannot do for you and the one thing that makes
    // the rest of it make sense — a shared calendar with one person in it is
    // just a calendar. It disappears once they have joined, because by then it
    // would be telling the second partner to invite someone who is already here.
    ...(seatFree ? [{
      glyph: g,
      label: "First things first",
      title: `Bring ${partner || "your partner"} in`,
      body:
        `Right now this family is just you. Make a link below and send it to them — ` +
        `they sign in with their own Google account and land here, in this same ` +
        `calendar. Everything either of you writes, you both see.`,
      invite: true,
    }] : []),
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
        `A shared list, sorted for you: Overdue, Today, Coming up, and the ones ` +
        `with no particular day. Add a task with the + button, put someone's name ` +
        `on it — either of you, the whole family, or one of the children — and give ` +
        `it a date if it has one. Tick the box to settle it; SETTLED holds ` +
        `everything already done.`,
    },
    {
      glyph: g3,
      label: "The Ledger",
      title: "How it chases you",
      body:
        `Anything due today shows as a number beside The Ledger in this menu — ` +
        `and on the app icon itself, once you have added it to your home screen. ` +
        `It stays until the task is done, and overdue still counts as today, so ` +
        `nothing quietly disappears. Once a day you also get one notification ` +
        `naming what is outstanding. Chores that come round again can repeat ` +
        `daily, weekly, fortnightly or monthly, and come back on their own once ticked.`,
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

/**
 * Makes the first step do the thing rather than describe it.
 *
 * Telling someone to go to Settings and find a button is how a step gets
 * skipped; the link is minted here and copied in one tap. Any invitation the
 * family already has is reused, so tapping twice does not scatter live links
 * around.
 */
function PartnerInvite() {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const make = async () => {
    setBusy(true);
    setFailed(false);
    try {
      // Reuse a live one before minting another.
      const existing = await fetch("/api/invites", { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const live = (existing?.invites ?? []).find(
        (i: { kind: string; used: boolean; expired: boolean; url: string }) =>
          i.kind === "partner" && !i.used && !i.expired,
      );
      const link = live?.url ?? (await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ kind: "partner" }),
      }).then((r) => (r.ok ? r.json() : null)).then((d) => d?.url));

      if (!link) { setFailed(true); return; }
      setUrl(link);
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      } catch {
        // No clipboard permission — the link is on screen to copy by hand.
      }
    } finally { setBusy(false); }
  };

  if (!url) {
    return (
      <div className="mt-4">
        <button className="rr-btn-quiet" onClick={make} disabled={busy}>
          {busy ? "Making the link…" : "Make the link"}
        </button>
        {failed && (
          <p className="rr-italic mt-2" style={{ fontSize: 14, color: "var(--terracotta)" }}>
            That did not work. You can also do it from Settings → Invitations.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="rr-meta" style={{ fontSize: 9.5 }}>
        {copied ? "Copied — send it to them" : "Send them this link"}
      </p>
      <p
        className="mt-1.5"
        style={{
          fontSize: 12.5, color: "var(--muted)", wordBreak: "break-all",
          border: "1px solid var(--rule)", borderRadius: "var(--radius-control, 0)",
          padding: "9px 11px", background: "var(--wash)",
        }}
      >
        {url}
      </p>
      <button
        className="rr-action mt-2"
        onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* select it by hand */ }
        }}
      >
        {copied ? "Copy again" : "Copy"}
      </button>
      <p className="rr-italic mt-2" style={{ fontSize: 13.5, color: "var(--faint)" }}>
        It works once and lasts two weeks. You can make another from Settings.
      </p>
    </div>
  );
}

export default function Walkthrough({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme, definition } = useTheme();
  const { couple } = useSession();
  // usePartnerName() falls back to the role itself, which reads as "Bring
  // Husband in" before that person exists. Nobody is called Husband.
  const named = usePartnerName();
  const partner = named && named !== "Wife" && named !== "Husband" && named !== "your partner"
    ? named
    : "";
  const [i, setI] = useState(0);

  // members is keyed by role and holds adults only, so one key means the
  // other seat is still empty.
  const seatFree = Object.keys(couple?.members ?? {}).length < 2;
  const steps = stepsFor(definition.words, theme, partner, seatFree);
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
                // The longest step clears a 360x640 screen by about 20px,
                // which larger system text would swallow. Scrolling inside
                // the card is better than a title cropped off the top.
                maxHeight: "calc(100dvh - 36px)",
                overflowY: "auto",
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

              {step.invite && <PartnerInvite />}

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
