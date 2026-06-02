"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "./SessionProvider";
import { getDisplayName } from "@/lib/names";
import { CoffeeIcon, HeartIcon } from "@/components/icons";
import ThemeToggle from "./ThemeToggle";
import type { LevelResult } from "@/lib/level";

interface GoogleStatus {
  connected: boolean;
  email?: string;
}

function MenuIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export default function UserMenu({
  onSendNote,
}: {
  onSendNote: () => void;
}) {
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

  if (!user) return null;

  const startDate = new Date(process.env.NEXT_PUBLIC_RELATIONSHIP_START || "2017-01-31");
  const daysTogether = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));

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
            <h1
              className="text-[22px] sm:text-[28px] leading-tight"
              style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}
            >
              Our Calendar
            </h1>
            <p
              className="text-[10.5px] sm:text-xs flex items-center gap-1 mt-0.5"
              style={{ color: "var(--text-soft)" }}
            >
              {getDisplayName("Wife")} &amp; {getDisplayName("Husband")} &middot; together since 2017
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
              <span className="text-sm">{levelData.emoji}</span>
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
            {mobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
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
            <div className="flex -space-x-2">
              <div
                className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] border-2"
                style={{
                  background: "#6b3a1f",
                  color: "#fce8c8",
                  fontFamily: "var(--font-caprasimo), cursive",
                  borderColor: "var(--card-bg)",
                }}
              >
                {getDisplayName("Wife")[0]}
              </div>
              <div
                className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] border-2"
                style={{
                  background: "#c14a33",
                  color: "#fce8c8",
                  fontFamily: "var(--font-caprasimo), cursive",
                  borderColor: "var(--card-bg)",
                }}
              >
                {getDisplayName("Husband")[0]}
              </div>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {daysTogether.toLocaleString()} days
              </div>
              <div className="text-[10.5px] flex items-center gap-1" style={{ color: "var(--text-soft)" }}>
                together <HeartIcon size={10} />
              </div>
            </div>
          </div>

          {/* Send note pill */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSendNote}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border shadow-sm transition-colors"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
              color: "var(--text)",
            }}
          >
            <span style={{ color: "#c14a33" }}><HeartIcon size={14} /></span>
            <span className="text-xs sm:text-sm font-medium">Send note</span>
          </motion.button>

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
              <span className="text-sm">{levelData.emoji}</span>
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
            <span className="text-xs sm:text-sm font-medium">📸 Memories</span>
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
            <span className="text-xs sm:text-sm font-medium">📊 Stats</span>
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
            <span className="text-xs sm:text-sm font-medium">🕰️ Timeline</span>
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
                <div className="flex -space-x-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs border-2"
                    style={{
                      background: "#6b3a1f",
                      color: "#fce8c8",
                      fontFamily: "var(--font-caprasimo), cursive",
                      borderColor: "var(--card-bg)",
                    }}
                  >
                    {getDisplayName("Wife")[0]}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs border-2"
                    style={{
                      background: "#c14a33",
                      color: "#fce8c8",
                      fontFamily: "var(--font-caprasimo), cursive",
                      borderColor: "var(--card-bg)",
                    }}
                  >
                    {getDisplayName("Husband")[0]}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    {daysTogether.toLocaleString()} days together
                  </div>
                  <div className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-soft)" }}>
                    {levelData ? `${levelData.emoji} ${levelData.title} · Level ${levelData.level}` : "Loading..."}
                  </div>
                </div>
              </div>

              {/* Navigation grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { onSendNote(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2.5 p-3 rounded-xl border transition-colors"
                  style={{
                    background: "var(--card-bg)",
                    borderColor: "var(--card-border)",
                    color: "var(--text)",
                  }}
                >
                  <span style={{ color: "#c14a33" }}><HeartIcon size={16} /></span>
                  <span className="text-[13px] font-medium">Send note</span>
                </motion.button>

                <Link
                  href="/memories"
                  className="flex items-center gap-2.5 p-3 rounded-xl border transition-colors"
                  style={{
                    background: "var(--card-bg)",
                    borderColor: "var(--card-border)",
                    color: "var(--text)",
                  }}
                >
                  <span className="text-base">📸</span>
                  <span className="text-[13px] font-medium">Memories</span>
                </Link>

                <Link
                  href="/stats"
                  className="flex items-center gap-2.5 p-3 rounded-xl border transition-colors"
                  style={{
                    background: "var(--card-bg)",
                    borderColor: "var(--card-border)",
                    color: "var(--text)",
                  }}
                >
                  <span className="text-base">📊</span>
                  <span className="text-[13px] font-medium">Stats</span>
                </Link>

                <Link
                  href="/timeline"
                  className="flex items-center gap-2.5 p-3 rounded-xl border transition-colors"
                  style={{
                    background: "var(--card-bg)",
                    borderColor: "var(--card-border)",
                    color: "var(--text)",
                  }}
                >
                  <span className="text-base">🕰️</span>
                  <span className="text-[13px] font-medium">Timeline</span>
                </Link>
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
