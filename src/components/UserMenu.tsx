"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "./SessionProvider";
import { getDisplayName } from "@/lib/names";
import {
  CoffeeIcon, HeartIcon, MenuIcon, XIcon, PolaroidIcon, StatsIcon, LetterIcon,
  TimelineIcon, BirthdayCakeIcon, LevelIcons,
} from "@/components/icons";
import ThemeToggle from "./ThemeToggle";
import BirthdayInviteButton from "./BirthdayInviteButton";
import type { LevelResult } from "@/lib/level";

interface GoogleStatus {
  connected: boolean;
  email?: string;
}

/** Overlapping Wife + Husband initial circles (shared by desktop pill & mobile menu). */
function CoupleAvatars({ size = 26 }: { size?: number }) {
  const avatar = (who: "Wife" | "Husband") => (
    <div
      className="rounded-full flex items-center justify-center border-2 heading-font"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: who === "Wife" ? "var(--accent)" : "var(--danger)",
        color: "var(--hero-text)",
        borderColor: "var(--card-bg)",
      }}
    >
      {getDisplayName(who)[0]}
    </div>
  );
  return (
    <div className="flex -space-x-2">
      {avatar("Wife")}
      {avatar("Husband")}
    </div>
  );
}

/** Level icon with emoji fallback (emoji stays valid data from the API). */
function LevelGlyph({ level, emoji, size = 14 }: { level: number; emoji: string; size?: number }) {
  const Icon = LevelIcons[level];
  return Icon ? <Icon size={size} /> : <span className="text-sm">{emoji}</span>;
}

export default function UserMenu() {
  const { user, logout } = useSession();
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [levelData, setLevelData] = useState<LevelResult | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/auth/google/status?userId=${user}`)
      .then((r) => r.json())
      .then((d) => setGoogleStatus({ connected: d.connected, email: d.email }))
      .catch(() => setGoogleStatus({ connected: false }));
    fetch("/api/level")
      .then((r) => r.json())
      .then((d) => setLevelData(d))
      .catch(() => {});
  }, [user]);

  // Close menu on route navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a[href]")) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const [startDate] = useState(
    () => new Date(process.env.NEXT_PUBLIC_RELATIONSHIP_START || "2017-01-31"),
  );
  const [daysTogether] = useState(
    () => Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  if (!user) return null;

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-4 sm:px-8 pt-4 sm:pt-5 pb-0">
        {/* Left: logo + title */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] sm:rounded-[14px] flex items-center justify-center shadow-lg shrink-0"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            <CoffeeIcon size={20} />
          </div>
          <div>
            <h1 className="heading-font text-[22px] sm:text-[28px] leading-tight" style={{ color: "var(--accent)" }}>
              Our Calendar
            </h1>
            <p
              className="text-[11px] sm:text-xs flex items-center gap-1 mt-0.5"
              style={{ color: "var(--text-soft)" }}
            >
              {getDisplayName("Wife")} &amp; {getDisplayName("Husband")} &middot; together since {startDate.getFullYear()}
            </p>
          </div>
        </div>

        {/* Mobile: hamburger button */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Small level badge on mobile */}
          {levelData && (
            <Link
              href="/stats"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              <LevelGlyph level={levelData.level} emoji={levelData.emoji} />
              Lv.{levelData.level}
            </Link>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
              color: "var(--text)",
            }}
          >
            {mobileMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </motion.button>
        </div>

        {/* Desktop: pills row */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Days together pill */}
          <div
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border shadow-sm"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            <CoupleAvatars size={26} />
            <div className="leading-tight">
              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {daysTogether.toLocaleString()} days
              </div>
              <div className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-soft)" }}>
                together <HeartIcon size={10} />
              </div>
            </div>
          </div>

          {/* Birthday slideshow invite */}
          <BirthdayInviteButton />

          {/* Level pill */}
          {levelData && (
            <Link
              href="/stats"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-colors hover:opacity-80"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                color: "var(--text)",
              }}
              title={`${levelData.title} — ${levelData.score} pts`}
            >
              <LevelGlyph level={levelData.level} emoji={levelData.emoji} />
              <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Lv. {levelData.level}</span>
            </Link>
          )}

          {/* Memories link */}
          <Link href="/memories"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border shadow-sm transition-colors hover:opacity-80"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
              color: "var(--text)",
            }}
          >
            <PolaroidIcon size={15} />
            <span className="text-xs sm:text-sm font-medium">Memories</span>
          </Link>

          {/* Stats link */}
          <Link href="/stats"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border shadow-sm transition-colors hover:opacity-80"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
              color: "var(--text)",
            }}
          >
            <StatsIcon size={15} />
            <span className="text-xs sm:text-sm font-medium">Stats</span>
          </Link>

          {/* Notes link */}
          <Link href="/notes"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border shadow-sm transition-colors hover:opacity-80"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
              color: "var(--text)",
            }}
          >
            <LetterIcon size={15} />
            <span className="text-xs sm:text-sm font-medium">Notes</span>
          </Link>

          {/* Timeline link */}
          <Link href="/timeline"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border shadow-sm transition-colors hover:opacity-80"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
              color: "var(--text)",
            }}
          >
            <TimelineIcon size={15} />
            <span className="text-xs sm:text-sm font-medium">Timeline</span>
          </Link>

          {/* Google Connect */}
          {googleStatus && !googleStatus.connected && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                const w = window.open("", "_blank");
                fetch(`/api/auth/google?userId=${user}`)
                  .then((r) => r.json())
                  .then((d) => { if (d.url && w) w.location.href = d.url; });
              }}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors hidden md:block"
              style={{
                background: "var(--chip-bg)",
                borderColor: "var(--chip-border)",
                color: "var(--chip-text)",
              }}
            >
              Connect Calendar
            </motion.button>
          )}

          {/* Sign out */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: "var(--text-soft)" }}
          >
            Sign out
          </motion.button>

          <ThemeToggle />
        </div>
      </header>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 sm:hidden"
              style={{ background: "rgba(40, 25, 15, 0.3)", backdropFilter: "blur(4px)" }}
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Menu panel */}
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="absolute left-3 right-3 top-[68px] z-50 rounded-2xl border shadow-xl p-4 sm:hidden"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                boxShadow: "0 20px 60px -15px rgba(40, 20, 5, 0.35)",
              }}
            >
              {/* Days together */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl mb-3"
                style={{ background: "var(--chip-bg)" }}
              >
                <CoupleAvatars size={32} />
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    {daysTogether.toLocaleString()} days together
                  </div>
                  <div className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-soft)" }}>
                    {levelData ? (
                      <>
                        <LevelGlyph level={levelData.level} emoji={levelData.emoji} size={12} />
                        {levelData.title} · Level {levelData.level}
                      </>
                    ) : "Loading..."}
                  </div>
                </div>
              </div>

              {/* Navigation grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { href: "/notes", label: "Notes", Icon: LetterIcon },
                  { href: "/memories", label: "Memories", Icon: PolaroidIcon },
                  { href: "/stats", label: "Stats", Icon: StatsIcon },
                  { href: "/timeline", label: "Timeline", Icon: TimelineIcon },
                  { href: "/birthday", label: "Slideshow", Icon: BirthdayCakeIcon },
                ].map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2.5 p-3 rounded-xl border transition-colors"
                    style={{
                      background: "var(--card-bg)",
                      borderColor: "var(--card-border)",
                      color: "var(--text)",
                    }}
                  >
                    <Icon size={18} style={{ color: "var(--accent)" }} />
                    <span className="text-[13px] font-medium">{label}</span>
                  </Link>
                ))}
              </div>

              {/* Google Connect on mobile */}
              {googleStatus && !googleStatus.connected && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const w = window.open("", "_blank");
                    fetch(`/api/auth/google?userId=${user}`)
                      .then((r) => r.json())
                      .then((d) => { if (d.url && w) w.location.href = d.url; });
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border mb-3 text-[13px] font-medium transition-colors"
                  style={{
                    background: "var(--chip-bg)",
                    borderColor: "var(--chip-border)",
                    color: "var(--chip-text)",
                  }}
                >
                  Connect Google Calendar
                </motion.button>
              )}

              {/* Bottom row: theme toggle + sign out */}
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--divider)" }}>
                <ThemeToggle />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="text-[13px] font-medium py-2 px-3 rounded-lg transition-colors"
                  style={{ color: "var(--text-soft)" }}
                >
                  Sign out
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
