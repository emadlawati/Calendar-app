"use client";

import { useUser } from "./UserProvider";
import { Cat, ExternalLink, Unlink, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface GoogleStatus {
  connected: boolean;
  email?: string;
  updatedAt?: string;
}

export default function UserToggle() {
  const { currentUser, setCurrentUser } = useUser();
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null); // "Wife" | "Husband" | null
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncMessage, setResyncMessage] = useState<string | null>(null);

  const toggleUser = () => {
    setCurrentUser(currentUser === "Wife" ? "Husband" : "Wife");
  };

  const checkGoogleStatus = async (userId: string) => {
    try {
      setIsChecking(true);
      const res = await fetch(`/api/auth/google/status?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.connected) {
        setGoogleStatus({ connected: true, email: data.email, updatedAt: data.updatedAt });
      } else {
        setGoogleStatus({ connected: false });
      }
    } catch {
      setGoogleStatus({ connected: false });
    } finally {
      setIsChecking(false);
    }
  };

  const connectGoogle = async (userId: string) => {
    setIsConnecting(userId);
    try {
      const res = await fetch(`/api/auth/google?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.url) {
        // Redirect to Google OAuth
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to initiate Google connection:", err);
    } finally {
      setIsConnecting(null);
    }
  };

  const resyncGoogleCalendar = async () => {
    setIsResyncing(true);
    setResyncMessage(null);
    try {
      const res = await fetch("/api/events/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser }),
      });
      const data = await res.json();
      if (data.success) {
        setResyncMessage(`✅ Synced ${data.syncedCount} events to ${currentUser}'s Google Calendar`);
      } else {
        setResyncMessage(`❌ Resync failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setResyncMessage("❌ Resync failed: Network error");
      console.error("Resync error:", err);
    } finally {
      setIsResyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setResyncMessage(null), 5000);
    }
  };

  // Check Google status on mount and when user changes
  useEffect(() => {
    // Check both users' status
    const checkBoth = async () => {
      await checkGoogleStatus(currentUser);
    };
    checkBoth();
  }, [currentUser]);

  return (
    <div className="flex flex-col items-end gap-3">
      <motion.div 
        className="flex items-center space-x-3 bg-white p-2 rounded-full shadow-plush border border-latte-brown/20 cursor-pointer w-fit" 
        onClick={toggleUser}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${currentUser === "Wife" ? "bg-blush-pink text-text-dark" : "bg-gray-100 text-gray-400"}`}
          animate={{ rotate: currentUser === "Wife" ? -10 : 0 }}
        >
          <Cat size={20} />
        </motion.div>
        <span className="text-text-dark font-sniglet text-sm min-w-[60px] text-center font-bold">
          {currentUser}
        </span>
        <motion.div
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${currentUser === "Husband" ? "bg-soft-peach text-text-dark" : "bg-gray-100 text-gray-400"}`}
          animate={{ rotate: currentUser === "Husband" ? 10 : 0 }}
        >
          <Cat size={20} />
        </motion.div>
      </motion.div>

      {/* Google Calendar connection section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 w-full max-w-[280px]"
      >
        {/* Wife's Google Calendar */}
        <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-latte-brown/10 shadow-sm">
          <span className="text-xs font-bold text-text-dark flex items-center gap-1.5">
            <Cat size={12} className="text-blush-pink" />
            Wife's Calendar
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => connectGoogle("Wife")}
            disabled={isConnecting === "Wife"}
            className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 ${
              isConnecting === "Wife"
                ? "bg-gray-200 text-gray-400 cursor-wait"
                : googleStatus?.connected && currentUser === "Wife"
                ? "bg-green-100 text-green-700 border border-green-300 cursor-default"
                : "bg-blush-pink/20 text-blush-pink-dark border border-blush-pink/30 hover:bg-blush-pink/30"
            }`}
          >
            {isConnecting === "Wife" ? (
              <>Connecting...</>
            ) : googleStatus?.connected && currentUser === "Wife" ? (
              <><ExternalLink size={10} /> Connected</>
            ) : (
              <><ExternalLink size={10} /> Connect</>
            )}
          </motion.button>
        </div>

        {/* Husband's Google Calendar */}
        <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-latte-brown/10 shadow-sm">
          <span className="text-xs font-bold text-text-dark flex items-center gap-1.5">
            <Cat size={12} className="text-soft-peach" />
            Husband's Calendar
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => connectGoogle("Husband")}
            disabled={isConnecting === "Husband"}
            className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 ${
              isConnecting === "Husband"
                ? "bg-gray-200 text-gray-400 cursor-wait"
                : googleStatus?.connected && currentUser === "Husband"
                ? "bg-green-100 text-green-700 border border-green-300 cursor-default"
                : "bg-soft-peach/30 text-soft-peach-dark border border-soft-peach/40 hover:bg-soft-peach/50"
            }`}
          >
            {isConnecting === "Husband" ? (
              <>Connecting...</>
            ) : googleStatus?.connected && currentUser === "Husband" ? (
              <><ExternalLink size={10} /> Connected</>
            ) : (
              <><ExternalLink size={10} /> Connect</>
            )}
          </motion.button>
        </div>

        {/* Resync button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={resyncGoogleCalendar}
            disabled={isResyncing}
            className="w-full text-xs py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 bg-white/80 border border-latte-brown/10 shadow-sm hover:bg-latte-brown/5 disabled:opacity-50 disabled:cursor-wait text-text-dark"
          >
            <RefreshCw size={12} className={isResyncing ? "animate-spin" : ""} />
            {isResyncing ? "Resyncing..." : "Resync Google Calendar"}
          </motion.button>
          {resyncMessage && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-center mt-1 text-text-dark/70"
            >
              {resyncMessage}
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
