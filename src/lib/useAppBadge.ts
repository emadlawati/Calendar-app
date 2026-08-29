"use client";

import { useCallback, useEffect } from "react";

/**
 * Puts today's count on the installed app's icon.
 *
 * This is as close to a home-screen widget as the web gets. Real widgets need
 * native code on both platforms — WidgetKit on iOS, AppWidgetProvider on
 * Android — and the `widgets` manifest member only ever shipped on Windows.
 * The Badging API is the one home-screen surface browsers expose.
 *
 * It refreshes whenever the app is opened or brought back to the foreground,
 * which includes opening it from a notification. It cannot refresh while the
 * app is closed: a service worker could only do that on a silent push, and
 * push on both platforms must be user-visible.
 *
 * Unsupported everywhere except an installed PWA, so every call is guarded —
 * on a normal browser tab these methods simply don't exist.
 */
export default function useAppBadge(enabled: boolean) {
  const refresh = useCallback(async () => {
    if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;
    try {
      const res = await fetch("/api/badge", { credentials: "same-origin" });
      if (!res.ok) return;
      const { count } = await res.json();
      if (typeof count !== "number") return;
      if (count > 0) await navigator.setAppBadge(count);
      else await navigator.clearAppBadge?.();
    } catch {
      // A badge that won't set is not worth surfacing to anyone.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, refresh]);

  return refresh;
}
