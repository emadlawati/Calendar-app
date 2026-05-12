"use client";

import { motion } from "framer-motion";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CoffeeIcon, PawIcon } from "@/components/icons";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const attemptedEmail = searchParams.get("email");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { setIsLoading(false); }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="w-full max-w-sm p-8 rounded-3xl border shadow-xl text-center"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
      >
        <motion.div animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
            <CoffeeIcon size={28} />
          </div>
        </motion.div>

        <h1 className="text-2xl mt-4" style={{ fontFamily: "var(--font-caprasimo), cursive", color: "var(--accent)" }}>
          Our Calendar
        </h1>
        <p className="text-sm mt-1.5 mb-8" style={{ color: "var(--text-soft)" }}>
          brewing memories together
        </p>

        {error === "unauthorized" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl p-4 mb-6 text-left text-sm border"
            style={{ background: "rgba(193, 74, 51, 0.06)", borderColor: "rgba(193, 74, 51, 0.2)", color: "#9b3a2a" }}
          >
            <p className="font-semibold mb-1 flex items-center gap-1"><PawIcon size={12} /> Not registered!</p>
            <p className="mb-2">The Google account{attemptedEmail ? ` (${attemptedEmail})` : ""} you tried isn&apos;t linked to this calendar.</p>
            <p className="text-xs opacity-70">Make sure WIFE_EMAIL and HUSBAND_EMAIL in Vercel environment variables match your actual Google emails.</p>
          </motion.div>
        )}

        {error === "no_email" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl p-3 mb-6 text-sm border"
            style={{ background: "rgba(193, 74, 51, 0.06)", borderColor: "rgba(193, 74, 51, 0.2)", color: "#9b3a2a" }}>
            Could not retrieve your email. Please try again.
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogin} disabled={isLoading}
          className="w-full rounded-2xl px-6 py-4 flex items-center justify-center gap-3 border transition-colors disabled:opacity-50 shadow-sm"
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text)" }}>
          {isLoading ? (
            <span>Connecting...</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </>
          )}
        </motion.button>

        <p className="text-xs mt-6" style={{ color: "var(--text-very)" }}>
          Only registered couples can access this calendar
        </p>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="text-3xl">☕</motion.div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
