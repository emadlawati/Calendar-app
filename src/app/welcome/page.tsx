"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookGlyph from "@/components/BookGlyph";
import { useSession } from "@/components/SessionProvider";

interface Member { role: string; name: string; email: string; birthday: string | null }

/**
 * Collected after sign-in, never from the invitation link — the details are
 * only trusted once we know who is filling them in.
 */
export default function WelcomePage() {
  const router = useRouter();
  const { user, refresh } = useSession();

  const [members, setMembers] = useState<Member[]>([]);
  const [yourName, setYourName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [childName, setChildName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/couple")
      .then((r) => r.json())
      .then((c) => {
        if (!c?.users) return;
        setMembers(c.users);
        const me = c.users.find((u: Member) => u.role === user);
        const them = c.users.find((u: Member) => u.role !== user);
        // Placeholder names ("Wife"/"Husband") shouldn't be shown back as real answers.
        if (me && me.name !== me.role) setYourName(me.name);
        if (them && them.name !== them.role) setPartnerName(them.name);
        if (c.childName) setChildName(c.childName);
        if (c.displayName && c.displayName !== "A new collection") {
          // keep whatever they already set
        }
        setStartDate(new Date(c.startDate).toISOString().slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user]);

  const partnerRole = user === "Wife" ? "Husband" : "Wife";
  const partnerExists = members.some((m) => m.role === partnerRole);

  const save = async () => {
    if (!yourName.trim()) { setError("Your name, at least."); return; }
    setSaving(true);
    setError("");

    const you = yourName.trim();
    const them = partnerName.trim();
    const displayName = them ? `${you} & ${them}` : you;

    const payload: Record<string, unknown> = {
      displayName,
      childName: childName.trim() || null,
      startDate: startDate || undefined,
      members: [{ role: user, name: you }],
    };
    // Only name the partner if their seat already exists.
    if (them && partnerExists) {
      (payload.members as unknown[]).push({ role: partnerRole, name: them });
    }

    try {
      const res = await fetch("/api/couple", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setError("Could not save. Try again."); setSaving(false); return; }
      refresh();
      router.push("/");
    } catch {
      setError("Could not save. Try again.");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-[22px] py-10" style={{ background: "var(--paper)" }}>
      <div style={{ maxWidth: 460, width: "100%" }}>
        <div className="flex items-center gap-2">
          <BookGlyph size={18} />
          <span className="rr-label" style={{ color: "var(--terracotta)" }}>A new volume</span>
        </div>
        <h1 className="rr-display mt-3" style={{ fontSize: 30, lineHeight: 1.1, color: "var(--ink)" }}>
          Before the first entry
        </h1>
        <p className="rr-italic mt-2" style={{ fontSize: 16, color: "var(--muted)" }}>
          A few details, so the shelf knows whose it is.
        </p>

        {!loaded ? (
          <p className="rr-italic mt-8" style={{ fontSize: 17, color: "var(--ghost)" }}>just a moment…</p>
        ) : (
          <>
            <section className="mt-8">
              <p className="rr-label">Your name</p>
              <input value={yourName} onChange={(e) => setYourName(e.target.value)}
                className="rr-display mt-2" style={{ fontSize: 22 }} placeholder="what they call you" />
            </section>

            <section className="mt-7">
              <p className="rr-label">{partnerExists ? "Your partner" : "Your partner (they can join later)"}</p>
              <input value={partnerName} onChange={(e) => setPartnerName(e.target.value)}
                className="rr-display mt-2" style={{ fontSize: 22 }} placeholder="their name" />
            </section>

            <section className="mt-7">
              <p className="rr-label">Together since</p>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="rr-display mt-2" style={{ fontSize: 20 }} />
            </section>

            <section className="mt-7">
              <p className="rr-label">A child, if there is one</p>
              <input value={childName} onChange={(e) => setChildName(e.target.value)}
                className="rr-display mt-2" style={{ fontSize: 20 }} placeholder="leave blank if not" />
            </section>

            {error && <p className="rr-italic mt-5" style={{ fontSize: 15, color: "var(--terracotta)" }}>{error}</p>}

            <button className="rr-btn w-full justify-center mt-8" onClick={save} disabled={saving}>
              {saving ? "Binding…" : "Open the volume"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
