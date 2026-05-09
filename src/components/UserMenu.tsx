"use client";

import { motion } from "framer-motion";
import { Cat, ExternalLink, LogOut, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "./SessionProvider";
import { getDisplayName } from "@/lib/names";

interface GoogleStatus {
  connected: boolean;
  email?: string;
}

export default function UserMenu() {
  const { user, logout, isLoading } = useSession();
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/auth/google/status?userId=${user}`)
      .then((res) => res.json())
      .then((data) => {
        setGoogleStatus({
          connected: data.connected,
          email: data.email,
        });
      })
      .catch(() => setGoogleStatus({ connected: false }));
  }, [user]);

  const connectGoogle = async () => {
    if (!user) return;
    setIsConnecting(true);
    try {
      const res = await fetch(`/api/auth/google?userId=${user}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to connect Google:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="animate-spin text-latte-brown" size={20} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1 border border-latte-brown/20 shadow-sm">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center ${
            user === "Wife" ? "bg-blush-pink" : "bg-soft-peach"
          }`}
        >
          <Cat size={12} className="text-text-dark" />
        </div>
        <span className="text-xs md:text-sm font-bold font-sniglet text-text-dark">
          {getDisplayName(user)}
        </span>
      </div>

      {/* Google Calendar connect */}
      {googleStatus?.connected ? (
        <div className="hidden md:flex items-center gap-1 bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded-full border border-green-200">
          <ExternalLink size={10} />
          <span>Calendar</span>
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={connectGoogle}
          disabled={isConnecting}
          className="hidden md:flex items-center gap-1 bg-white/80 text-text-dark text-xs font-bold px-3 py-1.5 rounded-full border border-latte-brown/20 hover:border-blush-pink transition-colors"
        >
          {isConnecting ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <ExternalLink size={10} />
          )}
          Connect Calendar
        </motion.button>
      )}

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={logout}
        className="flex items-center gap-1 bg-white/80 text-text-dark/60 text-xs font-bold px-2 py-1.5 rounded-full border border-latte-brown/10 hover:text-red-400 hover:border-red-200 transition-colors"
      >
        <LogOut size={12} />
        <span className="hidden sm:inline">Sign out</span>
      </motion.button>
    </div>
  );
}
