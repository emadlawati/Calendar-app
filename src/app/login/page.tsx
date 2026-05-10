"use client";

import { motion } from "framer-motion";
import { HeartPulse, Cat } from "lucide-react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Login error:", err);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-milk-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="w-full max-w-sm plush-card p-8 text-center relative"
      >
        <div className="absolute -top-3 -left-1 w-8 h-8 bg-white rotate-45 rounded-tl-xl border-t border-l border-latte-brown/20" />
        <div className="absolute -top-3 -right-1 w-8 h-8 bg-white rotate-45 rounded-tr-xl border-t border-r border-latte-brown/20" />

        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <HeartPulse className="text-blush-pink mx-auto" size={48} />
        </motion.div>

        <h1 className="text-2xl font-sniglet text-text-dark mt-4">
          Purrfect Plans
        </h1>
        <p className="text-text-dark/60 text-sm mt-2 mb-8">
          Your shared couple&apos;s calendar 🐾
        </p>

        {error === "unauthorized" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl p-4 mb-6 text-left"
          >
            <p className="font-bold mb-1 flex items-center gap-1"><Cat size={14} /> Not registered!</p>
            <p className="mb-2">
              The Google account{attemptedEmail ? ` (${attemptedEmail})` : ""} you tried isn't linked to this calendar.
            </p>
            <p className="text-xs opacity-70">
              Make sure <strong>WIFE_EMAIL</strong> and <strong>HUSBAND_EMAIL</strong> in Vercel environment variables match your actual Google emails.
            </p>
          </motion.div>
        )}

        {error === "no_email" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl p-3 mb-6"
          >
            Could not retrieve your email. Please try again.
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-white border-2 border-latte-brown/20 rounded-2xl px-6 py-4 font-sniglet text-text-dark flex items-center justify-center gap-3 hover:border-blush-pink transition-colors shadow-sm disabled:opacity-50"
        >
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

        <p className="text-xs text-text-dark/40 mt-6">
          Only registered couples can access this calendar 🧶
        </p>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-milk-white">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="text-4xl">🧶</motion.div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
