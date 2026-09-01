"use client";

import { useEffect, useState } from "react";
import { useSession } from "./SessionProvider";
import { formatHijri } from "@/lib/hijri";

interface Member {
  id: string; role: string | null; kind: string;
  name: string; email: string | null; title: string | null; birthday: string | null;
}
interface CoupleRecord {
  displayName: string; startDate: string; hijriOffset: number; users: Member[];
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

  const setMember = (id: string, patch: Partial<Member>) => {
    setCouple((c) => c && ({
      ...c,
      users: c.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  };

  const addChild = () => {
    setCouple((c) => c && ({
      ...c,
      // A blank id marks a child that doesn't exist server-side yet.
      users: [...c.users, { id: `new-${c.users.length}-${c.displayName.length}`, role: null, kind: "child", name: "", email: null, title: null, birthday: "" }],
    }));
  };

  const removeChild = (id: string) => {
    setCouple((c) => c && ({ ...c, users: c.users.filter((u) => u.id !== id) }));
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
          startDate: couple.startDate,
          hijriOffset: couple.hijriOffset ?? 0,
          members: couple.users
            .filter((u) => u.kind === "adult")
            .map((u) => ({
              role: u.role, name: u.name, title: u.title ?? "",
              birthday: u.birthday || "",
            })),
          // Sent whole, so removing one here removes it there.
          children: couple.users
            .filter((u) => u.kind === "child" && u.name.trim())
            .map((u) => ({
              id: u.id.startsWith("new-") ? undefined : u.id,
              name: u.name,
              birthday: u.birthday || "",
            })),
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

  // Adults only. This counted every member, so a family that added a child on
  // the way in — which the welcome screen asks them to do — reached two rows
  // with one partner still missing, and the button to invite that partner
  // vanished. There is no other way to bring them in.
  const seatFree = couple.users.filter((u) => u.kind === "adult").length < 2;
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

        {couple.users.filter((u) => u.kind === "adult").map((u) => (
          <div key={u.id} className="mt-5 flex gap-5">
            <div className="flex-1">
              <p className="rr-label" style={{ fontSize: 9.5 }}>{u.title || u.role}</p>
              <input
                value={u.name}
                onChange={(e) => setMember(u.id, { name: e.target.value })}
                className="rr-display" style={{ fontSize: 19 }}
              />
            </div>
            <div style={{ width: 110 }}>
              <p className="rr-label" style={{ fontSize: 9.5 }}>Born (MM-DD)</p>
              <input
                value={u.birthday ?? ""}
                onChange={(e) => setMember(u.id, { birthday: e.target.value })}
                placeholder="04-09"
                style={{ fontSize: 15 }}
              />
            </div>
          </div>
        ))}

        <div className="mt-5">
          <p className="rr-label" style={{ fontSize: 9.5 }}>Together since</p>
          <input
            type="date"
            value={couple.startDate.slice(0, 10)}
            onChange={(e) => setCouple({ ...couple, startDate: e.target.value })}
            className="rr-display" style={{ fontSize: 18 }}
          />
        </div>

        {/* Oman goes by sighting, so the computed date can be a day out and
            only the family knows which way. */}
        <div className="mt-6">
          <p className="rr-label" style={{ fontSize: 9.5 }}>Hijri date</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="rr-display" style={{ fontSize: 18, color: "var(--ink)" }}>
              {formatHijri(new Date(), { offset: couple.hijriOffset ?? 0, year: true })}
            </span>
          </div>
          <div className="flex items-center gap-2.5 mt-3">
            {[-1, 0, 1].map((o) => (
              <button
                key={o}
                className="rr-btn-quiet"
                onClick={() => setCouple({ ...couple, hijriOffset: o })}
                style={
                  (couple.hijriOffset ?? 0) === o
                    ? { background: "var(--terracotta)", color: "var(--on-dark)", borderColor: "var(--terracotta)" }
                    : undefined
                }
              >
                {o === 0 ? "As computed" : o > 0 ? "A day later" : "A day earlier"}
              </button>
            ))}
          </div>
          <p className="rr-italic mt-2" style={{ fontSize: 13, color: "var(--muted)" }}>
            Nudge it to match what Oman announced.
          </p>
        </div>

        {/* Children: as many as there are. Each becomes its own tag on events
            and seeds its own birthday. */}
        <div className="mt-7">
          <p className="rr-label" style={{ fontSize: 9.5 }}>Children</p>
          {couple.users.filter((u) => u.kind === "child").length === 0 && (
            <p className="rr-italic mt-1" style={{ fontSize: 14, color: "var(--muted)" }}>
              None yet.
            </p>
          )}
          {couple.users.filter((u) => u.kind === "child").map((u) => (
            <div key={u.id} className="mt-3 flex items-end gap-4">
              <div className="flex-1">
                <input
                  value={u.name}
                  onChange={(e) => setMember(u.id, { name: e.target.value })}
                  placeholder="Name"
                  className="rr-display" style={{ fontSize: 18 }}
                />
              </div>
              <div style={{ width: 110 }}>
                <input
                  value={u.birthday ?? ""}
                  onChange={(e) => setMember(u.id, { birthday: e.target.value })}
                  placeholder="MM-DD"
                  style={{ fontSize: 15 }}
                />
              </div>
              <button
                className="rr-action"
                style={{ flex: "none", paddingBottom: 6 }}
                onClick={() => removeChild(u.id)}
              >
                Remove
              </button>
            </div>
          ))}
          <button className="rr-btn-quiet mt-4" onClick={addChild}>Add a child</button>
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
