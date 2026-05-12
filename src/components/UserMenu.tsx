"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSession } from "./SessionProvider";
import { getDisplayName } from "@/lib/names";
import { CoffeeIcon, HeartIcon } from "@/components/icons";

interface GoogleStatus {
  connected: boolean;
  email?: string;
}

export default function UserMenu({
  onSendNote,
}: {
  onSendNote: () => void;
}) {
  const { user, logout } = useSession();
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/auth/google/status?userId=${user}`)
      .then((r) => r.json())
      .then((d) => setGoogleStatus({ connected: d.connected, email: d.email }))
      .catch(() => setGoogleStatus({ connected: false }));
  }, [user]);

  if (!user) return null;

  const startDate = new Date(process.env.NEXT_PUBLIC_RELATIONSHIP_START || "2019-01-01");
  const daysTogether = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <header className="flex items-center justify-between gap-4 px-8 pt-5 pb-0 flex-wrap">
      {/* Left: logo + title */}
      <div className="flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center shadow-lg shrink-0"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          <CoffeeIcon size={22} />
        </div>
        <div>
          <h1
            className="text-[28px] leading-tight"
            style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}
          >
            Our Calendar
          </h1>
          <p
            className="text-xs flex items-center gap-1 mt-0.5"
            style={{ color: "var(--text-soft)" }}
          >
            {getDisplayName("Wife")} &amp; {getDisplayName("Husband")} &middot; brewing memories since 2019
          </p>
        </div>
      </div>

      {/* Right: pills */}
      <div className="flex items-center gap-3">
        {/* Days together pill */}
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-full border shadow-sm"
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
          className="flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm transition-colors"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--card-border)",
            color: "var(--text)",
          }}
        >
          <span style={{ color: "#c14a33" }}><HeartIcon size={14} /></span>
          <span className="text-sm font-medium">Send note</span>
        </motion.button>

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
      </div>
    </header>
  );
}
