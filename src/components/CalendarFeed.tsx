"use client";

import { useEffect, useState } from "react";

interface Feed {
  exists: boolean;
  url?: string;
  lastUsedAt?: string | null;
  createdAt?: string;
}

/**
 * The calendar feed — how this app gets onto a home screen.
 *
 * A web app cannot draw a widget on either platform, but both ship a calendar
 * widget of their own and both will subscribe to a feed. So the widget is the
 * phone's, showing our entries.
 */
export default function CalendarFeed() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const load = () =>
    fetch("/api/feed", { credentials: "same-origin" })
      .then((r) => r.json())
      .then(setFeed)
      .catch(() => {});

  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/feed", { method: "POST", credentials: "same-origin" });
      if (r.ok) { setFeed(await r.json()); setShowUrl(true); }
    } finally { setBusy(false); }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await fetch("/api/feed", { method: "DELETE", credentials: "same-origin" });
      setFeed({ exists: false });
      setConfirmRevoke(false);
    } finally { setBusy(false); }
  };

  const copy = async () => {
    if (!feed?.url) return;
    try {
      await navigator.clipboard.writeText(feed.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { setShowUrl(true); }
  };

  if (!feed) return null;

  return (
    <section className="mt-10 pt-6" style={{ borderTop: "1px solid var(--rule)" }}>
      <p className="rr-label">On your home screen</p>
      <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
        Subscribe your phone&apos;s own calendar to these entries, and they show up
        in its calendar widget.
      </p>

      {!feed.exists ? (
        <button className="rr-btn-quiet mt-4" onClick={create} disabled={busy}>
          {busy ? "Working…" : "Create my link"}
        </button>
      ) : (
        <>
          <div
            className="mt-4 p-3"
            style={{ background: "var(--wash)", border: "1px solid var(--rule-light)" }}
          >
            <p
              style={{
                fontSize: 11.5,
                color: "var(--muted)",
                wordBreak: "break-all",
                fontFamily: "var(--font-ui), monospace",
              }}
            >
              {showUrl ? feed.url : feed.url?.replace(/\/api\/feed\/.*/, "/api/feed/••••••••••.ics")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button className="rr-btn-quiet" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
            <button className="rr-action" onClick={() => setShowUrl((v) => !v)} style={{ fontSize: 12 }}>
              {showUrl ? "Hide" : "Show"}
            </button>
            {!confirmRevoke ? (
              <button className="rr-action" onClick={() => setConfirmRevoke(true)} style={{ fontSize: 12 }}>
                Replace
              </button>
            ) : (
              <>
                <button
                  className="rr-action"
                  onClick={create}
                  disabled={busy}
                  style={{ fontSize: 12, color: "var(--terracotta)" }}
                >
                  Confirm — old link stops working
                </button>
                <button className="rr-action" onClick={() => setConfirmRevoke(false)} style={{ fontSize: 12 }}>
                  Cancel
                </button>
              </>
            )}
          </div>

          <p className="mt-3" style={{ fontSize: 12.5, color: "var(--terracotta)" }}>
            Treat this link like a password — anyone who has it can read your
            entries. Replace it if it ever gets out.
          </p>

          <div className="mt-5" style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>
            <p className="rr-label" style={{ fontSize: 9.5 }}>iPhone</p>
            <p className="mt-1">
              Settings → Apps → Calendar → Calendar Accounts → Add Account → Other
              → Add Subscribed Calendar, and paste the link. Then add the
              Calendar widget to your Home Screen.
            </p>
            <p className="rr-label mt-4" style={{ fontSize: 9.5 }}>Android</p>
            <p className="mt-1">
              On a computer, open Google Calendar → Other calendars → From URL,
              and paste the link. It appears in the Google Calendar app and its
              widget. Phones can&apos;t add a URL calendar — it has to be done on
              the web, once.
            </p>
            <p className="mt-4" style={{ fontSize: 12.5, color: "var(--faint)" }}>
              Both refresh on their own schedule — usually within an hour, and
              not immediately. Read-only: editing there won&apos;t change anything
              here.
            </p>
          </div>

          {feed.lastUsedAt && (
            <p className="rr-meta mt-4" style={{ fontSize: 10, color: "var(--faint)" }}>
              Last fetched {new Date(feed.lastUsedAt).toLocaleString("en-GB")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
