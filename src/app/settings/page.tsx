"use client";

import AppShell from "@/components/AppShell";
import ThemePicker from "@/components/ThemePicker";
import CoupleSettings from "@/components/CoupleSettings";
import NotificationSettings from "@/components/NotificationSettings";
import CalendarFeed from "@/components/CalendarFeed";
import { useSession } from "@/components/SessionProvider";

/**
 * Everything you change, in one place.
 *
 * These panels used to sit under the statistics on Our Shelf, which meant
 * scrolling past the record of your life to reach a checkbox — and the shelf
 * was reading as two unrelated pages stacked on top of each other.
 */
export default function SettingsPage() {
  const { couple } = useSession();

  return (
    <AppShell active="settings">
      <header className="pt-5">
        <h1 className="rr-display" style={{ fontSize: 26, color: "var(--ink)" }}>Settings</h1>
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          {couple?.displayName ?? "this account"}
        </p>
      </header>

      {/* Three themes, one of them dark — so this replaces the old light/dark
          toggle rather than sitting beside it. */}
      <ThemePicker />

      <CoupleSettings />
      <NotificationSettings />
      <CalendarFeed />

      <div style={{ height: 40 }} />
    </AppShell>
  );
}
