"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookGlyph from "@/components/BookGlyph";
import { useSession } from "@/components/SessionProvider";
import ThemePicker from "@/components/ThemePicker";

interface Member {
  id: string; role: string | null; kind: string;
  name: string; email: string | null; title: string | null; birthday: string | null;
}
interface Child { key: string; name: string; birthday: string }

const ROLES = [
  { role: "Wife", title: "Wife" },
  { role: "Husband", title: "Husband" },
  { role: "Wife", title: "Partner" },
] as const;

/**
 * Collected after sign-in, never from the invitation link — the details are
 * only trusted once we know who is filling them in.
 *
 * An invitation hands out whichever seat happens to be free, so the first
 * question is which partner this actually is. Until that is answered the
 * assignment is a guess.
 */
export default function WelcomePage() {
  const router = useRouter();
  const { user, refresh } = useSession();

  const [members, setMembers] = useState<Member[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [yourName, setYourName] = useState("");
  const [yourBirthday, setYourBirthday] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
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
        const them = c.users.find((u: Member) => u.kind === "adult" && u.role !== user);
        // Placeholder names ("Wife"/"Husband") shouldn't be shown back as real answers.
        if (me && me.name !== me.role) setYourName(me.name);
        if (me?.birthday) setYourBirthday(me.birthday);
        if (them && them.name !== them.role) setPartnerName(them.name);
        setChildren(
          c.users
            .filter((u: Member) => u.kind === "child")
            .map((u: Member, i: number) => ({ key: `has-${i}`, name: u.name, birthday: u.birthday ?? "" })),
        );
        setStartDate(new Date(c.startDate).toISOString().slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user]);

  const adults = members.filter((m) => m.kind === "adult");
  const partnerExists = adults.length > 1;
  // Only offer the swap while the other seat is empty; once a partner has
  // joined, their side is theirs.
  const canChooseRole = !partnerExists;

  const setChild = (key: string, patch: Partial<Child>) =>
    setChildren((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const save = async () => {
    if (!yourName.trim()) { setError("Your name, at least."); return; }
    setSaving(true);
    setError("");

    const you = yourName.trim();
    const them = partnerName.trim();
    const picked = choice !== null ? ROLES[choice] : null;
    const myRole = picked?.role ?? user;
    const partnerRole = myRole === "Wife" ? "Husband" : "Wife";

    const payload: Record<string, unknown> = {
      displayName: them ? `${you} & ${them}` : you,
      startDate: startDate || undefined,
      claimRole: canChooseRole && picked ? picked.role : undefined,
      members: [{ role: myRole, name: you, title: picked?.title, birthday: yourBirthday }],
      children: children
        .filter((c) => c.name.trim())
        .map((c) => ({ name: c.name.trim(), birthday: c.birthday })),
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
              <p className="rr-label">How it should look</p>
              <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
                Pick one and the rest of this page changes with it. You can swap later.
              </p>
              <ThemePicker compact />
            </section>

            {canChooseRole && (
              <section className="mt-8">
                <p className="rr-label">You are</p>
                <div className="flex flex-wrap gap-2.5 mt-2.5">
                  {ROLES.map((r, i) => (
                    <button
                      key={r.title}
                      onClick={() => setChoice(i)}
                      className="rr-btn-quiet"
                      style={
                        choice === i
                          ? { background: "var(--terracotta)", color: "var(--on-dark)", borderColor: "var(--terracotta)" }
                          : undefined
                      }
                    >
                      {r.title}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-7">
              <p className="rr-label">Your name</p>
              <input value={yourName} onChange={(e) => setYourName(e.target.value)}
                className="rr-display mt-2" style={{ fontSize: 22 }} placeholder="what they call you" />
            </section>

            <section className="mt-7">
              <p className="rr-label">Your birthday (MM-DD)</p>
              <input value={yourBirthday} onChange={(e) => setYourBirthday(e.target.value)}
                className="rr-display mt-2" style={{ fontSize: 20 }} placeholder="04-09" />
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
              <p className="rr-label">Children, if there are any</p>
              {children.map((c) => (
                <div key={c.key} className="mt-3 flex items-end gap-4">
                  <input value={c.name} onChange={(e) => setChild(c.key, { name: e.target.value })}
                    className="rr-display flex-1" style={{ fontSize: 20 }} placeholder="name" />
                  <input value={c.birthday} onChange={(e) => setChild(c.key, { birthday: e.target.value })}
                    style={{ fontSize: 15, width: 110 }} placeholder="MM-DD" />
                  <button className="rr-action" style={{ flex: "none", paddingBottom: 6 }}
                    onClick={() => setChildren((cs) => cs.filter((x) => x.key !== c.key))}>
                    Remove
                  </button>
                </div>
              ))}
              <button
                className="rr-btn-quiet mt-4"
                onClick={() => setChildren((cs) => [...cs, { key: `new-${cs.length}-${Date.now()}`, name: "", birthday: "" }])}
              >
                Add a child
              </button>
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
