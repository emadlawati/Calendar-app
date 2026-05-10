"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User } from "@/lib/types";

interface SessionState {
  user: User | null;
  email: string | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refresh: () => void;
}

const SessionContext = createContext<SessionState>({
  user: null,
  email: null,
  isLoading: true,
  logout: async () => {},
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setEmail(data.email);
      })
      .catch(() => {
        setUser(null);
        setEmail(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isLoading) return;
    // Only redirect if we're on the main app page (not login, not adjust, not API)
    const loc = window.location.pathname;
    if (!user && loc !== "/login" && !loc.startsWith("/events/adjust") && !loc.startsWith("/api/")) {
      window.location.href = "/login";
    }
  }, [user, isLoading]);

  const refresh = () => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setEmail(data.email);
      })
      .catch(() => {});
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setEmail(null);
    window.location.href = "/login";
  };

  return (
    <SessionContext.Provider value={{ user, email, isLoading, logout, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
