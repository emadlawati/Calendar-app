"use client";

import { useState } from "react";
import { THEMES, THEME_IDS, type ThemeId } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

/**
 * Choosing a skin.
 *
 * Each option paints itself in its own colours, so the choice is made by
 * looking rather than by reading three descriptions — and touching one
 * previews the whole app underneath until you pick or move on.
 */
export default function ThemePicker({
  onChosen,
  compact = false,
}: {
  onChosen?: (id: ThemeId) => void;
  /** The welcome screen wants no heading of its own. */
  compact?: boolean;
}) {
  const { theme, setTheme, previewTheme } = useTheme();
  const [saving, setSaving] = useState<ThemeId | null>(null);

  const choose = async (id: ThemeId) => {
    setSaving(id);
    try {
      await setTheme(id);
      onChosen?.(id);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className={compact ? "" : "mt-10 pt-6"} style={compact ? undefined : { borderTop: "1px solid var(--rule)" }}>
      {!compact && <p className="rr-label">Appearance</p>}
      {!compact && (
        <p className="rr-italic mt-1" style={{ fontSize: 15, color: "var(--muted)" }}>
          Both of you see the same one.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {THEME_IDS.map((id) => {
          const t = THEMES[id];
          const active = theme === id;
          return (
            <button
              key={id}
              onClick={() => choose(id)}
              onMouseEnter={() => previewTheme(id)}
              onMouseLeave={() => previewTheme(null)}
              onFocus={() => previewTheme(id)}
              onBlur={() => previewTheme(null)}
              disabled={saving !== null}
              className="w-full text-left flex items-stretch gap-0 overflow-hidden"
              style={{
                border: `1px solid ${active ? "var(--terracotta)" : "var(--rule)"}`,
                borderRadius: "var(--radius-card, 0)",
                boxShadow: active ? "inset 0 0 0 1px var(--terracotta)" : undefined,
              }}
            >
              {/* The theme, painted in its own colours rather than described. */}
              <span
                aria-hidden
                style={{
                  flex: "none", width: 74, background: t.swatch.ground,
                  display: "flex", alignItems: "flex-end", gap: 4, padding: 10,
                }}
              >
                <span style={{ display: "block", width: 8, height: 30, background: t.swatch.one }} />
                <span style={{ display: "block", width: 8, height: 20, background: t.swatch.two }} />
                <span style={{ display: "block", width: 8, height: 38, background: t.swatch.ink, opacity: 0.85 }} />
              </span>

              <span className="flex-1 min-w-0 p-3.5" style={{ background: "var(--card)" }}>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="rr-display" style={{ fontSize: 18, color: "var(--ink)" }}>{t.name}</span>
                  {active && (
                    <span className="rr-meta" style={{ fontSize: 9.5, color: "var(--terracotta)" }}>IN USE</span>
                  )}
                </span>
                <span className="block mt-1" style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.4 }}>
                  {t.blurb}
                </span>
                <span className="rr-meta block mt-1.5" style={{ fontSize: 9.5, color: "var(--faint)" }}>
                  {t.feeling.toUpperCase()}{t.dark ? " · DARK" : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
