"use client";

import { useEffect, useState } from "react";
import { useSession } from "./SessionProvider";

interface Member { role: string; name: string; email: string; birthday: string | null }
interface CoupleRecord {
  displayName: string; startDate: string; childName: string | null; users: Member[];
}
interface InviteRow {
  id: string; kind: "partner" | "couple"; note: string | null;
  used: boolean; expired: boolean; url: string;
}

/** Everything that used to be an environment variable, now editable. */
export default function CoupleSettings() {
  const { refresh } = useSession();
  const [couple, setCouple] = useState<CoupleRecord | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [canInviteCouples, setCanInviteCouples] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const loadInvites = () => {
    fetch("/api/invites")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.invites)) setInvites(d.invites);
        setCanInviteCouples(!!d?.canInviteCouples);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/couple").then((r) => r.json()).then((c) => { if (c?.users) setCouple(c); }).catch(() => {});
    loadInvites();
  }, []);

  const setMember = (role: string, patch: Partial<Member>) => {
    setCouple((c) => c && ({
      ...c,
      users: c.users.map((u) => (u.role === role ? { ...u, ...patch } : u)),
    }));
  };

  const save = async () => {
    if (!couple) return;
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/couple", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          displayName: couple.displayName,
          childName: couple.childName,
          startDate: couple.startDate,
          members: couple.users.map((u) => ({ role: u.role, name: u.name, birthday: u.birthday || "" })),
        }),
      });
      setStatus(res.ok ? "Saved." : "Could not save.");
      if (res.ok) refresh();
    } catch { setStatus("Could not save."); }
    finally { setSaving(false); }
  };

  const mint = async (kind: "partner" | "couple") => {
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ kind }),
    });
    const data = await res.json();
    if (!res.ok) { setStatus(data.error ?? "Could not create an invitation."); return; }
    loadInvites();
    setStatus("Invitation ready — copy the link below.");
  };

  const copy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* clipboard unavailable */ }
  };

  if (!couple) return null;

  const seatFree = couple.users.length < 2;
  const live = invites.filter((i) => !i.used && !i.expired);

  return (
    <>
      <section className="mt-10 pt-6" style={{ borderTop: "1px solid var(--rule)" }}>
        <p className="rr-label">The collection</p>

        <div className="mt-4">
          <p className="rr-label" style={{ fontSize: 9.5 }}>Called</p>
          <input
            value={couple.displayName}
            onChange={(e) => setCouple({ ...couple, displayName: e.target.value })}
            className="rr-display" style={{ fontSize: 20 }}
          />
        </div>

        {couple.users.map((u) => (
          <div key={u.role} className="mt-5 flex gap-5">
            <div className="flex-1">
              <p className="rr-label" style={{ fontSize: 9.5 }}>{u.role}</p>
              <input
                value={u.name}
                onChange={(e) => setMember(u.role, { name: e.target.value })}
                className="rr-display" style={{ fontSize: 19 }}
              />
            </div>
            <div style={{ width: 110 }}>
              <p className="rr-label" style={{ fontSize: 9.5 }}>Born (MM-DD)</p>
              <input
                value={u.birthday ?? ""}
                onChange={(e) => setMember(u.role, { birthday: e.target.value })}
                placeholder="04-09"
                style={{ fontSize: 15 }}
              />
            </div>
          </div>
        ))}

        <div className="mt-5 flex gap-5">
          <div className="flex-1">
            <p className="rr-label" style={{ fontSize: 9.5 }}>Together since</p>
            <input
              type="date"
              value={couple.startDate.slice(0, 10)}
              onChange={(e) => setCouple({ ...couple, startDate: e.target.value })}
              className="rr-display" style={{ fontSize: 18 }}
            />
          </div>
          <div className="flex-1">
            <p className="rr-label" style={{ fontSize: 9.5 }}>Child</p>
            <input
              value={couple.childName ?? ""}
              onChange={(e) => setCouple({ ...couple, childName: e.target.value })}
              placeholder="none"
              className="rr-display" style={{ fontSize: 18 }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <button className="rr-btn" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {status && (
            <span className="rr-italic" style={{ fontSize: 15, color: "var(--muted)" }}>{status}</span>
          )}
        </div>
      </section>

      <section className="mt-10 pt-6" style={{ borderTop: "1px solid var(--rule)" }}>
        <p className="rr-label">Invitations</p>
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          {seatFree
            ? "Your partner hasn't joined yet."
            : canInviteCouples
              ? "Hand a link to another couple and they get a shelf of their own."
              : "Both of you have joined."}
        </p>

        <div className="flex flex-wrap gap-3 mt-4">
          {seatFree && (
            <button className="rr-btn-quiet" onClick={() => mint("partner")}>Invite my partner</button>
          )}
          {canInviteCouples && (
            <button className="rr-btn-quiet" onClick={() => mint("couple")}>Invite another couple</button>
          )}
        </div>

        {live.length > 0 && (
          <div className="mt-5">
            {live.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-3" style={{ borderTop: "1px solid var(--rule-light)" }}>
                <span className="rr-meta" style={{ width: 62, flex: "none", fontSize: 10 }}>
                  {i.kind === "couple" ? "Couple" : "Partner"}
                </span>
                <span className="flex-1 min-w-0 truncate" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  {i.url}
                </span>
                <button className="rr-action" style={{ flex: "none" }} onClick={() => copy(i.url, i.id)}>
                  {copied === i.id ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
