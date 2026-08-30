"use client";

import AppShell from "@/components/AppShell";
import ThemeToggle from "@/components/ThemeToggle";
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

      <section className="mt-8 flex items-center justify-between gap-4">
        <span className="rr-label">Reading light</span>
        <ThemeToggle />
      </section>

      <CoupleSettings />
      <NotificationSettings />
      <CalendarFeed />

      <div style={{ height: 40 }} />
    </AppShell>
  );
}
