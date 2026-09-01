"use client";

import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { setBadge } from "@/lib/badge";

/**
 * How much of the ledger is on you today — one source of truth for the icon
 * badge, the drawer count, and the banner on Home.
 *
 * Kept here rather than fetched in three places so the number cannot disagree
 * with itself: a drawer saying 2 beside an icon saying 3 is worse than no
 * badge at all.
 *
 * Refreshed on navigation and whenever the window regains focus, which covers
 * the case that actually matters — ticking something off on your phone and
 * looking at the icon a second later. `ledger-changed` is dispatched by the
 * ledger itself so the count moves the instant you tick, without waiting for
 * a round trip through focus.
 */

interface DueItem { id: string; title: string; overdue: boolean }
interface LedgerDue {
  count: number;
  overdue: number;
  items: DueItem[];
  refresh: () => void;
}

const Ctx = createContext<LedgerDue>({ count: 0, overdue: 0, items: [], refresh: () => {} });

export const useLedgerDue = () => useContext(Ctx);

/** Tell the app the ledger changed, from anywhere, without prop-drilling. */
export function ledgerChanged() {
  try { window.dispatchEvent(new Event("ledger-changed")); } catch { /* SSR */ }
}

export default function LedgerDueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ count: number; overdue: number; items: DueItem[] }>({
    count: 0, overdue: 0, items: [],
  });
  const pathname = usePathname();

  const refresh = useCallback(() => {
    fetch("/api/tasks/due-today", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || typeof d.count !== "number") return;
        setState({ count: d.count, overdue: d.overdue ?? 0, items: d.items ?? [] });
        setBadge(d.count);
      })
      .catch(() => {
        // Offline or signed out. Leave the last known count alone rather than
        // clearing the badge on a flaky connection.
      });
  }, []);

  useEffect(() => { refresh(); }, [refresh, pathname]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("ledger-changed", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("ledger-changed", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  return (
    <Ctx.Provider value={{ ...state, refresh }}>{children}</Ctx.Provider>
  );
}
