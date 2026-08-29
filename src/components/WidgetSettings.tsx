"use client";

import { useState } from "react";
import { WIDGET_BLOCKS, type WidgetBlock, type WidgetConfig, type WidgetTheme } from "@/lib/widget-config";

const THEMES: { id: WidgetTheme; label: string }[] = [
  { id: "auto", label: "Follow the phone" },
  { id: "light", label: "Paper" },
  { id: "dark", label: "Night" },
];

/**
 * Choosing what the home-screen widget shows.
 *
 * The preview is the real endpoint, so what you see is literally the image the
 * phone will fetch — cache-busted on each save, since the URL is otherwise
 * identical and the browser would keep showing the old one.
 */
export default function WidgetSettings({
  widgetUrl,
  config,
  onSaved,
}: {
  widgetUrl: string;
  config: WidgetConfig;
  onSaved: (c: WidgetConfig) => void;
}) {
  const [draft, setDraft] = useState<WidgetConfig>(config);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [stamp, setStamp] = useState(() => Date.now());
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [copied, setCopied] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const toggle = (id: WidgetBlock) =>
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.includes(id) ? d.blocks.filter((b) => b !== id) : [...d.blocks, id],
    }));

  const save = async () => {
    if (draft.blocks.length === 0) {
      setStatus("Pick at least one thing to show.");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      const r = await fetch("/api/feed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(draft),
      });
      if (!r.ok) { setStatus("Could not save."); return; }
      const { widget } = await r.json();
      setDraft(widget);
      onSaved(widget);
      setStamp(Date.now());
      setStatus("Saved. The phone picks it up on its next refresh.");
    } catch {
      setStatus("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const copyImage = async () => {
    try {
      await navigator.clipboard.writeText(widgetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  // The stored link is absolute because a phone needs it that way, but the
  // preview must load from wherever this page is actually served — otherwise
  // it points at production and shows nothing while developing.
  const previewPath = widgetUrl.replace(/^https?:\/\/[^/]+/, "");
  const preview = `${previewPath}?size=${size}&v=${stamp}`;

  // Scriptable is the only way to put a themed widget on an iPhone. The script
  // is tiny because all the drawing happens on the server — it fetches the
  // image at the right size for whichever widget slot it lands in, and tells
  // us which appearance the phone is currently in.
  const scriptableSource = [
    "// Our Calendar — home screen widget",
    "// Paste into a new Scriptable script, then add a Scriptable widget",
    "// to the Home Screen and choose this script.",
    `const BASE = "${widgetUrl}";`,
    `const HOME = "${widgetUrl.replace(/\/api\/widget\/.*$/, "/")}";`,
    "",
    "const size = config.runsInWidget ? config.widgetFamily : \"medium\";",
    "const dark = Device.isUsingDarkAppearance();",
    "const url = `${BASE}?size=${size === \"large\" ? \"large\" : size === \"small\" ? \"small\" : \"medium\"}&theme=${dark ? \"dark\" : \"light\"}`;",
    "",
    "const img = await new Request(url).loadImage();",
    "const w = new ListWidget();",
    "w.setPadding(0, 0, 0, 0);",
    "w.backgroundColor = new Color(dark ? \"#1B1F19\" : \"#F7F5EC\");",
    "w.addImage(img).applyFillingContentMode();",
    "w.url = HOME;",
    "",
    "if (config.runsInWidget) Script.setWidget(w);",
    "else await w.presentMedium();",
    "Script.complete();",
  ].join("\n");

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(scriptableSource);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="mt-8">
      <p className="rr-label">The widget itself</p>
      <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
        Drawn in the app&apos;s own hand. Choose what goes in it.
      </p>

      {/* Preview — the actual endpoint, not a mock-up */}
      <div
        className="mt-4 flex items-center justify-center p-3"
        style={{ background: "var(--wash)", border: "1px solid var(--rule-light)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Widget preview"
          style={{ width: "100%", maxWidth: size === "small" ? 240 : 420, height: "auto" }}
        />
      </div>

      <div className="flex flex-wrap gap-2.5 mt-3">
        {(["small", "medium", "large"] as const).map((sz) => (
          <button
            key={sz}
            className="rr-btn-quiet"
            onClick={() => setSize(sz)}
            style={
              size === sz
                ? { background: "var(--terracotta)", color: "var(--paper)", borderColor: "var(--terracotta)" }
                : undefined
            }
          >
            {sz[0].toUpperCase() + sz.slice(1)}
          </button>
        ))}
      </div>

      {/* What to show */}
      <p className="rr-label mt-7" style={{ fontSize: 9.5 }}>Show</p>
      <div className="mt-2">
        {WIDGET_BLOCKS.map((b) => {
          const on = draft.blocks.includes(b.id);
          return (
            <button
              key={b.id}
              onClick={() => toggle(b.id)}
              className="w-full flex items-baseline justify-between gap-4 py-3 text-left"
              style={{ borderTop: "1px solid var(--rule-light)" }}
            >
              <span style={{ display: "block" }}>
                <span
                  className="rr-italic"
                  style={{ fontSize: 16, color: on ? "var(--ink)" : "var(--faint)" }}
                >
                  {b.label}
                </span>
                <span className="block" style={{ fontSize: 12.5, color: "var(--faint)" }}>
                  {b.hint}
                </span>
              </span>
              <span
                className="rr-meta"
                style={{ flex: "none", fontSize: 10, color: on ? "var(--terracotta)" : "var(--ghost)" }}
              >
                {on ? "SHOWN" : "———"}
              </span>
            </button>
          );
        })}
      </div>

      {/* How many rows */}
      <div className="flex items-center justify-between gap-4 mt-6">
        <span className="rr-label" style={{ fontSize: 9.5 }}>Entries listed</span>
        <div className="flex items-center gap-2.5">
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              className="rr-action"
              onClick={() => setDraft((d) => ({ ...d, rows: n }))}
              style={{ fontSize: 13, color: draft.rows === n ? "var(--terracotta)" : "var(--faint)" }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <p className="rr-label mt-6" style={{ fontSize: 9.5 }}>Appearance</p>
      <div className="flex flex-wrap gap-2.5 mt-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className="rr-btn-quiet"
            onClick={() => setDraft((d) => ({ ...d, theme: t.id }))}
            style={
              draft.theme === t.id
                ? { background: "var(--terracotta)", color: "var(--paper)", borderColor: "var(--terracotta)" }
                : undefined
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-6">
        <button className="rr-btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save widget"}
        </button>
        <button className="rr-action" onClick={copyImage} style={{ fontSize: 12 }}>
          {copied ? "Copied" : "Copy widget link"}
        </button>
        <button className="rr-action" onClick={copyScript} style={{ fontSize: 12 }}>
          {copiedScript ? "Copied" : "Copy iPhone script"}
        </button>
      </div>
      {status && (
        <p className="rr-italic mt-3" style={{ fontSize: 14, color: "var(--muted)" }}>{status}</p>
      )}

      <div className="mt-6" style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>
        <p className="rr-label" style={{ fontSize: 9.5 }}>iPhone — Scriptable</p>
        <p className="mt-1">
          Install Scriptable (free), make a new script, paste what
          &ldquo;Copy iPhone script&rdquo; gives you, then add a Scriptable
          widget to the Home Screen and choose that script. It picks its own
          size and follows light or dark automatically.
        </p>
        <p className="rr-label mt-4" style={{ fontSize: 9.5 }}>Android</p>
        <p className="mt-1">
          Any widget app that shows an image from a URL will do. Point it at
          the widget link and set it to refresh every 30 minutes or so.
        </p>
        <p className="mt-3" style={{ fontSize: 12.5, color: "var(--faint)" }}>
          Both need one free app, because neither platform lets a website place
          a widget of its own.
        </p>
      </div>
    </div>
  );
}
