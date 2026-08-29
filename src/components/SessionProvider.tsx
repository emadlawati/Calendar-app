"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { resolvePeople, getPersonById, type PersonTag } from "@/lib/people";
import type { User } from "@/lib/types";

/** The couple, as the client needs it — no NEXT_PUBLIC_* involved. */
export interface CoupleInfo {
  id: string;
  displayName: string;
  startDate: string;
  childName: string | null;
  timezone: string;
  /** role -> display name, e.g. { Wife: "Budoor", Husband: "Emad" } */
  members: Record<string, string>;
}

interface SessionState {
  user: User | null;
  email: string | null;
  couple: CoupleInfo | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refresh: () => void;
}

const SessionContext = createContext<SessionState>({
  user: null,
  email: null,
  couple: null,
  isLoading: true,
  logout: async () => {},
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [couple, setCouple] = useState<CoupleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback((done?: () => void) => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setEmail(data.email);
        setCouple(data.couple ?? null);
      })
      .catch(() => {
        setUser(null);
        setEmail(null);
        setCouple(null);
      })
      .finally(() => done?.());
  }, []);

  useEffect(() => {
    load(() => setIsLoading(false));
  }, [load]);

  useEffect(() => {
    if (isLoading) return;
    // Only redirect if we're on the main app page (not login, not adjust, not API)
    const loc = window.location.pathname;
    if (!user && loc !== "/login" && !loc.startsWith("/events/adjust") && !loc.startsWith("/api/")) {
      window.location.href = "/login";
    }
  }, [user, isLoading]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setEmail(null);
    setCouple(null);
    window.location.href = "/login";
  };

  return (
    <SessionContext.Provider value={{ user, email, couple, isLoading, logout, refresh: load }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

/**
 * Names for the signed-in couple. Same call shape as the old
 * getDisplayName(role), but sourced from the couple rather than env vars —
 * so a second couple sees their own names.
 */
export function useNames(): (role: string) => string {
  const { couple } = useContext(SessionContext);
  return useCallback(
    (role: string) => couple?.members?.[role] ?? role,
    [couple],
  );
}

/**
 * The person tags (Family / Couples / <Wife> / <Emad> / <child>), labelled
 * for the signed-in couple.
 */
export function usePeople() {
  const { couple } = useContext(SessionContext);
  return useMemo(
    () => resolvePeople({
      wife: couple?.members?.Wife,
      husband: couple?.members?.Husband,
      child: couple?.childName ?? null,
    }),
    [couple],
  );
}

/** Look up a single person tag, labelled for this couple. */
export function usePerson(): (id: string | null | undefined) => PersonTag | null {
  const { couple } = useContext(SessionContext);
  return useCallback(
    (id: string | null | undefined) => getPersonById(id, {
      wife: couple?.members?.Wife,
      husband: couple?.members?.Husband,
      child: couple?.childName ?? null,
    }),
    [couple],
  );
}

/** The other person's display name. */
export function usePartnerName(): string {
  const { user, couple } = useContext(SessionContext);
  if (!user) return "your partner";
  const partner = user === "Wife" ? "Husband" : "Wife";
  return couple?.members?.[partner] ?? partner;
}
