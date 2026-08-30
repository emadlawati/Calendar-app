"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_THEME, isThemeId, themeOf, type ThemeId, type ThemeDefinition } from "@/lib/themes";

interface ThemeContextValue {
  theme: ThemeId;
  definition: ThemeDefinition;
  /** Persists to the family record, so both partners see the same app. */
  setTheme: (id: ThemeId) => Promise<void>;
  /** Preview without saving — used by the picker. */
  previewTheme: (id: ThemeId | null) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  definition: themeOf(DEFAULT_THEME),
  setTheme: async () => {},
  previewTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "theme-id";

/** Paint before the first fetch returns, so the app never flashes the wrong skin. */
function apply(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [preview, setPreview] = useState<ThemeId | null>(null);

  useEffect(() => {
    // The family record is the source of truth, but it takes a round trip.
    // The last known choice is mirrored locally purely to avoid a flash.
    let local: ThemeId | null = null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isThemeId(stored)) local = stored;
    } catch { /* private mode */ }
    if (local) { setThemeState(local); apply(local); }

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const id = isThemeId(d?.couple?.theme) ? d.couple.theme : DEFAULT_THEME;
        setThemeState(id);
        apply(id);
        try { localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode */ }
      })
      .catch(() => {
        if (!local) apply(DEFAULT_THEME);
      });
  }, []);

  // A preview overrides the saved theme until it is cleared.
  useEffect(() => {
    apply(preview ?? theme);
  }, [preview, theme]);

  const setTheme = async (id: ThemeId) => {
    setThemeState(id);
    setPreview(null);
    apply(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode */ }
    await fetch("/api/couple", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ theme: id }),
    }).catch(() => {});
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        definition: themeOf(preview ?? theme),
        setTheme,
        previewTheme: setPreview,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
