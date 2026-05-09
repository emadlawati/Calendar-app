"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { User } from "@/lib/types";

interface SessionState {
  user: User | null;
  email: string | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
      setEmail(data.email);
    } catch {
      setUser(null);
      setEmail(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

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
