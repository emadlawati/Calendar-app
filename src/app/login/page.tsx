"use client";

import { motion } from "framer-motion";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CoffeeIcon, PawIcon } from "@/components/icons";
import { CalendarSkeleton } from "@/components/Skeleton";

/**
 * Every way sign-in can fail, said plainly.
 *
 * redeemInvite() can return six different errors and the callback redirects
 * here with each of them; this page used to render two. So an invitation that
 * failed for any reason dropped the guest on an ordinary login screen with no
 * explanation — on the one flow that only ever happens to someone new.
 */
const ERRORS: Record<string, { title: string; body: string; next?: string }> = {
  unauthorized: {
    title: "Not on this calendar",
    body: "That Google account isn't linked to any family here.",
    next: "This calendar is invite-only. Ask whoever invited you for a link, and sign in with the address they sent it to.",
  },
  no_email: {
    title: "Google didn't share an address",
    body: "We couldn't read an email address from that account.",
    next: "Try again, and allow access to your email when Google asks.",
  },
  invite_unknown: {
    title: "That link isn't recognised",
    body: "The invitation doesn't exist — it may have been replaced.",
    next: "Ask for a fresh link.",
  },
  invite_used: {
    title: "That link has been used",
    body: "Invitations work once, so nobody can join twice on the same link.",
    next: "If it wasn't you who used it, ask for a new one.",
  },
  invite_expired: {
    title: "That link has expired",
    body: "Invitations last two weeks.",
    next: "Ask for a fresh link.",
  },
  invite_wrong_email: {
    title: "That link was for a different address",
    body: "This invitation is tied to one email address, and it isn't the one you signed in with.",
    next: "Sign in with the address the invitation was sent to.",
  },
  already_member: {
    title: "You're already here",
    body: "That address already belongs to a family on this calendar.",
    next: "Sign in normally instead of using the invitation.",
  },
  seat_taken: {
    title: "That place is already filled",
    body: "Someone has already joined as the partner this invitation was for.",
    next: "Check with them, or ask for a new invitation.",
  },
};

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

        <h1 className="heading-font text-2xl mt-4" style={{ color: "var(--accent)" }}>
          Our Calendar
        </h1>
        <p className="text-sm mt-1.5 mb-8" style={{ color: "var(--text-soft)" }}>
          a private record of your days together
        </p>

        {error && ERRORS[error] && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl p-4 mb-6 text-left text-sm border"
            style={{
              background: "color-mix(in srgb, var(--danger) 6%, transparent)",
              borderColor: "color-mix(in srgb, var(--danger) 20%, transparent)",
              color: "var(--danger)",
            }}
          >
            <p className="font-semibold mb-1 flex items-center gap-1">
              <PawIcon size={12} /> {ERRORS[error].title}
            </p>
            <p className="mb-2">
              {ERRORS[error].body}
              {error === "unauthorized" && attemptedEmail ? ` (${attemptedEmail})` : ""}
            </p>
            {ERRORS[error].next && (
              <p className="text-xs opacity-80">{ERRORS[error].next}</p>
            )}
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
        <div className="w-full max-w-sm p-8">
          <CalendarSkeleton />
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
