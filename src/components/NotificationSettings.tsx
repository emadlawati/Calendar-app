"use client";

import { useCallback, useEffect, useState } from "react";
import { enablePush, pushSupported } from "@/lib/push-client";

interface Device {
  id: string;
  mine: boolean;
  who: string;
  platform: string;
  since: string;
}

/**
 * Notifications, with the failures visible.
 *
 * The previous prompt caught every error and showed the same "add the VAPID
 * keys" message whatever went wrong, and never checked whether the server
 * accepted the subscription — so a device could fail to register and still
 * report success. That is why one partner had no devices at all for months.
 */
export default function NotificationSettings() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [permission, setPermission] = useState<string>("default");
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");

  const supported = pushSupported();

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/push/test");
      if (r.ok) setDevices((await r.json()).devices ?? []);
    } catch { /* offline */ }
    if (!supported) return;
    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.ready;
      setRegistered(!!(await reg.pushManager.getSubscription()));
    } catch { setRegistered(false); }
  }, [supported]);

  useEffect(() => {
    if (supported) navigator.serviceWorker.register("/sw.js").catch(() => {});
    load();
  }, [load, supported]);

  const enable = async () => {
    setBusy(true); setStatus(""); setProblem("");
    const result = await enablePush();
    if (result.ok) {
      setStatus("This device is registered.");
      setPermission("granted");
    } else {
      setProblem(result.reason);
      if (result.denied) setPermission("denied");
    }
    await load();
    setBusy(false);
  };

  const test = async () => {
    setBusy(true); setStatus(""); setProblem("");
    try {
      const r = await fetch("/api/push/test", { method: "POST" });
      const d = await r.json();
      if (d.sent > 0) {
        setStatus(`Sent to ${d.sent} device${d.sent === 1 ? "" : "s"}. It should arrive now.`);
      } else if (d.failed > 0) {
        const first = d.results.find((x: { ok: boolean }) => !x.ok);
        setProblem(`${first.platform} rejected it${first.status ? ` (${first.status})` : ""}: ${first.error}`);
      } else {
        setProblem("You have no registered devices yet — enable notifications above first.");
      }
      await load();
    } catch {
      setProblem("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const mine = devices.filter((d) => d.mine);

  return (
    <section className="mt-10 pt-6" style={{ borderTop: "1px solid var(--rule)" }}>
      <p className="rr-label">Notifications</p>

      {!supported ? (
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          This browser can&apos;t receive them. On iPhone, add the app to your Home
          Screen first and open it from there.
        </p>
      ) : (
        <>
          <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
            {mine.length === 0
              ? "No devices registered — nothing sent to you can arrive."
              : `${mine.length} device${mine.length === 1 ? "" : "s"} registered to you.`}
          </p>

          {mine.length > 0 && (
            <div className="mt-3">
              {mine.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                  style={{ borderTop: "1px solid var(--rule-light)" }}
                >
                  <span style={{ fontSize: 14, color: "var(--ink)" }}>{d.platform}</span>
                  <span className="rr-meta" style={{ fontSize: 10, color: "var(--faint)" }}>
                    {new Date(d.since).toISOString().slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-4">
            {!(registered && mine.length > 0) && (
              <button className="rr-btn-quiet" onClick={enable} disabled={busy}>
                {busy ? "Working…" : "Enable on this device"}
              </button>
            )}
            {mine.length > 0 && (
              <button className="rr-btn-quiet" onClick={test} disabled={busy}>
                {busy ? "Working…" : "Send me a test"}
              </button>
            )}
          </div>

          {status && (
            <p className="rr-italic mt-3" style={{ fontSize: 14, color: "var(--muted)" }}>{status}</p>
          )}
          {problem && (
            <p className="mt-3" style={{ fontSize: 13, color: "var(--terracotta)" }}>{problem}</p>
          )}
          {permission === "denied" && !problem && (
            <p className="mt-3" style={{ fontSize: 13, color: "var(--terracotta)" }}>
              Notifications are blocked for this site in your browser settings.
            </p>
          )}
        </>
      )}
    </section>
  );
}
