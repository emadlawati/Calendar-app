"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { resolvePeople, getPersonById, type PersonTag } from "@/lib/people";
import { formatHijri } from "@/lib/hijri";
import type { User } from "@/lib/types";

/** The couple, as the client needs it — no NEXT_PUBLIC_* involved. */
export interface CoupleInfo {
  id: string;
  displayName: string;
  startDate: string;
  timezone: string;
  hijriOffset: number;
  canInviteFamilies: boolean;
  /** role -> display name, e.g. { Wife: "Budoor", Husband: "Emad" } */
  members: Record<string, string>;
  /** Children have no role to key on, so they arrive as a list. */
  children: { id: string; name: string; birthday: string | null }[];
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

/** The roster in the shape lib/people expects. */
function rosterOf(couple: CoupleInfo | null) {
  return {
    wife: couple?.members?.Wife,
    husband: couple?.members?.Husband,
    children: couple?.children ?? [],
  };
}

/**
 * The person tags — Family, Couples, each partner, and one per child,
 * labelled for the signed-in family.
 */
export function usePeople() {
  const { couple } = useContext(SessionContext);
  return useMemo(() => resolvePeople(rosterOf(couple)), [couple]);
}

/** Look up a single person tag, labelled for this family. */
export function usePerson(): (id: string | null | undefined) => PersonTag | null {
  const { couple } = useContext(SessionContext);
  return useCallback(
    (id: string | null | undefined) => getPersonById(id, rosterOf(couple)),
    [couple],
  );
}

/**
 * The Hijri date for this family, already nudged by their own offset.
 * Returns "" if the browser has no Islamic calendar data.
 */
export function useHijri(): (d: Date, opts?: { year?: boolean }) => string {
  const { couple } = useContext(SessionContext);
  return useCallback(
    (d: Date, opts?: { year?: boolean }) =>
      formatHijri(d, {
        offset: couple?.hijriOffset ?? 0,
        timeZone: couple?.timezone,
        year: opts?.year,
      }),
    [couple],
  );
}

/** The family's children, for settings and onboarding. */
export function useChildren() {
  const { couple } = useContext(SessionContext);
  return couple?.children ?? [];
}

/** The other person's display name. */
export function usePartnerName(): string {
  const { user, couple } = useContext(SessionContext);
  if (!user) return "your partner";
  const partner = user === "Wife" ? "Husband" : "Wife";
  return couple?.members?.[partner] ?? partner;
}
