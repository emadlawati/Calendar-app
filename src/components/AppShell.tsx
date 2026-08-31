"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "./SessionProvider";
import { getVolumeInfo } from "@/lib/volume";
import { useTheme } from "./ThemeProvider";
import type { ThemeWords } from "@/lib/themes";
import { SPARK } from "./ThemeGlyph";
import useAppBadge from "@/lib/useAppBadge";
import type { StreakData } from "@/lib/types";

export type ShelfSection = "calendar" | "story" | "letters" | "ledger" | "shelf" | "reading-list" | "settings" | null;

/**
 * Two of these are named by the theme — the stats page and the wish list —
 * so the drawer reads in the chosen voice rather than always as a library.
 */
function navFor(words: ThemeWords): { key: Exclude<ShelfSection, null>; name: string; href: string }[] {
  return [
    { key: "calendar",     name: words.calendar,   href: "/calendar" },
    { key: "story",        name: "Our Story",      href: "/story" },
    { key: "letters",      name: "Letters",        href: "/notes" },
    { key: "ledger",       name: "The Ledger",     href: "/ledger" },
    { key: "shelf",        name: words.shelf,      href: "/shelf" },
    { key: "reading-list", name: words.wishlist,   href: "/reading-list" },
    { key: "settings",     name: "Settings",       href: "/settings" },
  ];
}

function HamburgerGlyph() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
      <path d="M0 1h16M0 6h16M0 11h16" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/**
 * The drawer's marker column (§3.8: "marker (14–22px column) + name").
 *
 * Each theme marks its rows its own way — Coffee with a 7px dot, Observatory
 * with ✦, Reading Room with a short rule. The brief numbers Reading Room's
 * rows in roman numerals; those were dropped on request, and a rule keeps the
 * marker column without bringing them back.
 */
function Marker({ active }: { active: boolean }) {
  const { theme } = useTheme();
  const on = active ? "var(--gold)" : "rgba(247,245,236,.3)";

  if (theme === "coffee") {
    return <span aria-hidden style={{
      width: 7, height: 7, borderRadius: "999px", flex: "none", background: on,
    }} />;
  }
  if (theme === "observatory") {
    return <span aria-hidden style={{
      width: 14, flex: "none", fontSize: 12, lineHeight: 1, textAlign: "center",
      color: active ? "var(--gold)" : "var(--ghost)",
    }}>{SPARK}</span>;
  }
  return <span aria-hidden style={{
    width: 14, height: 1, flex: "none",
    background: active ? "var(--gold)" : "rgba(247,245,236,.3)",
  }} />;
}

function DrawerPanel({ active, onNavigate }: { active: ShelfSection; onNavigate?: () => void }) {
  const { logout, couple } = useSession();
  const { theme, definition } = useTheme();
  const NAV = navFor(definition.words);
  const dw = definition.words;
  const [streak, setStreak] = useState<StreakData | null>(null);
  // Derived from the couple, so a second couple sees their own volume.
  const vol = getVolumeInfo(couple?.startDate);

  useEffect(() => {
    fetch("/api/streaks")
      .then((r) => r.json())
      .then((d) => { if (d?.currentStreak !== undefined) setStreak(d); })
      .catch(() => {});
  }, []);

  const weeks = streak?.currentStreak ?? 0;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--green-deep)" }}>
      {/* Header */}
      <Link
        href="/"
        onClick={onNavigate}
        className="block px-6 pt-8 pb-7"
        style={{ borderBottom: "1px solid rgba(247,245,236,.12)" }}
      >
        <p className="rr-label" style={{ color: "var(--sage-pale)" }}>The collection of</p>
        <p className="rr-display mt-2" style={{ fontSize: 27, color: "var(--on-dark)", lineHeight: 1.1 }}>
          {couple?.displayName ?? " "}
        </p>
        <p className="rr-italic mt-1" style={{ fontSize: 14, color: "var(--sage-pale)" }}>
          est. {vol.startYear}
        </p>
      </Link>

      {/* Entries */}
      <nav className="flex-1">
        {NAV.map((item) => {
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-4 px-6 py-[18px]"
              style={{
                // Coffee's rows are rounded blocks that fill when active;
                // the other two are ruled rows.
                borderBottom: theme === "coffee" ? "none" : "1px solid rgba(247,245,236,.12)",
                borderRadius: theme === "coffee" ? 12 : 0,
                margin: theme === "coffee" ? "2px 10px" : undefined,
                padding: theme === "coffee" ? "14px 16px" : undefined,
                background: theme === "coffee" && isActive
                  ? "color-mix(in srgb, var(--gold) 22%, transparent)"
                  : "transparent",
              }}
            >
              <Marker active={isActive} />
              <span
                className="rr-display flex-1"
                style={{ fontSize: 21, color: "var(--on-dark)", fontWeight: isActive ? 600 : 500 }}
              >
                {item.name}
              </span>
              {isActive && theme !== "coffee" && (
                <span style={{
                  width: 6, height: 6, background: "var(--gold)", flex: "none",
                  borderRadius: theme === "observatory" ? "999px" : 0,
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* The streak, in the theme's words — held blank until the streak is known, so
          the zero state never flashes over a real one. */}
      <div className="px-6 pb-7 pt-6">
        <div style={{
          border: "1px solid rgba(247,245,236,.22)", padding: "14px 16px", minHeight: 62,
          borderRadius: "var(--radius-card, 0)",
        }}>
          {streak !== null && (
            <>
              <p className="rr-italic" style={{ fontSize: 16, color: "var(--gold)" }}>
                {weeks > 0 ? dw.drawerOn(weeks) : dw.drawerOff}
              </p>
              <p className="rr-italic mt-1" style={{ fontSize: 13, color: "var(--sage-pale)" }}>
                {weeks > 0 ? dw.drawerOnSub : dw.drawerOffSub}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 mt-5">
          <Link href="/shelf" onClick={onNavigate} className="rr-action" style={{ color: "var(--sage-pale)" }}>
            Settings
          </Link>
          <span style={{ color: "rgba(247,245,236,.3)" }}>·</span>
          <button onClick={() => { onNavigate?.(); logout(); }} className="rr-action" style={{ color: "var(--sage-pale)" }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Every screen sits in this shell: a hamburger (mobile) or a persistent
 * 298px sidebar (desktop), plus an optional single FAB.
 */
export default function AppShell({
  active = null,
  children,
  fab,
  wide = false,
}: {
  active?: ShelfSection;
  children: ReactNode;
  fab?: ReactNode;
  /** Home and Calendar may use the wider two-column reading width. */
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useSession();

  // Every screen sits inside this shell, so the icon's count stays current
  // wherever you happen to be when you open the app.
  useAppBadge(!!user);

  // Close on Escape — the drawer is a dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      {/* Persistent sidebar — desktop only */}
      <aside
        className="hidden lg:block fixed inset-y-0 left-0 z-30"
        style={{ width: 298 }}
      >
        <DrawerPanel active={active} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "color-mix(in srgb, var(--green-darkest) 55%, transparent)" }}
            />
            <motion.div
              initial={{ x: -298 }}
              animate={{ x: 0 }}
              exit={{ x: -298 }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
              style={{ width: 298 }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <DrawerPanel active={active} onNavigate={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="lg:pl-[298px]">
        <div className={wide ? "mx-auto" : ""} style={wide ? { maxWidth: 1100 } : undefined}>
          <div className={wide ? "px-[22px] lg:px-8 pb-32" : "rr-page"}>
            <div className="pt-6 lg:hidden">
              <button
                className="rr-hamburger"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
              >
                <HamburgerGlyph />
              </button>
            </div>
            <div className="lg:pt-8">{children}</div>
          </div>
        </div>
      </div>

      {fab}
    </div>
  );
}

/** The single circular action, bottom-right. */
export function Fab({ onClick, label = "New entry" }: { onClick: () => void; label?: string }) {
  return (
    <button className="rr-fab" onClick={onClick} aria-label={label}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </button>
  );
}
