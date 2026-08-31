"use client";

import { useEffect, useState, use } from "react";
import BookGlyph from "@/components/BookGlyph";

interface InviteInfo {
  valid: boolean;
  reason?: string;
  kind?: "partner" | "couple";
  role?: string | null;
  couple?: string | null;
}

const REASONS: Record<string, string> = {
  unknown: "This invitation doesn't exist.",
  used: "This invitation has already been used.",
  expired: "This invitation has expired.",
};

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ valid: false, reason: "unknown" }));
  }, [token]);

  const accept = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/login?invite=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setBusy(false);
    } catch { setBusy(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-[22px]" style={{ background: "var(--paper)" }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div className="rr-double">
          <div>
            <div className="flex items-center gap-2">
              <BookGlyph size={18} />
              <span className="rr-label" style={{ color: "var(--terracotta)" }}>An invitation</span>
            </div>

            {info === null ? (
              <p className="rr-italic mt-5" style={{ fontSize: 18, color: "var(--ghost)" }}>opening the envelope…</p>
            ) : !info.valid ? (
              <>
                <h1 className="rr-display mt-4" style={{ fontSize: 28, lineHeight: 1.1, color: "var(--ink)" }}>
                  Nothing to open
                </h1>
                <p className="rr-italic mt-2" style={{ fontSize: 16, color: "var(--muted)" }}>
                  {REASONS[info.reason ?? "unknown"] ?? REASONS.unknown}
                </p>
              </>
            ) : (
              <>
                <h1 className="rr-display mt-4" style={{ fontSize: 30, lineHeight: 1.1, color: "var(--ink)" }}>
                  {info.kind === "partner"
                    ? `Join ${info.couple ?? "your partner"}`
                    : "Start a place of your own"}
                </h1>
                <p className="rr-italic mt-3" style={{ fontSize: 17, lineHeight: 1.45, color: "var(--muted)" }}>
                  {info.kind === "partner"
                    ? "Your partner keeps your days here, and would like you in it too."
                    : "A quiet place to keep the days you spend together — no points, no levels."}
                </p>

                <div className="rr-hairline mt-6 pt-5">
                  <button className="rr-btn w-full justify-center" onClick={accept} disabled={busy}>
                    {busy ? "Opening…" : "Continue with Google"}
                  </button>
                  <p className="rr-meta mt-3" style={{ fontSize: 10, textAlign: "center" }}>
                    We only use it to know it&apos;s you
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
