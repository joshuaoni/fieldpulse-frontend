"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, logout as clearSession } from "@/features/auth/api";
import type { AuthUser } from "@/features/auth/types";
import { isAllowedUser } from "./access";
import { getToken } from "./token";

type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionValue {
  status: SessionStatus;
  user: AuthUser | null;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

async function resolveSession(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  try {
    const user = await fetchMe();

    if (!isAllowedUser(user.email)) {
      clearSession();
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    const resolved = await resolveSession();
    setUser(resolved);
    setStatus(resolved ? "authenticated" : "anonymous");
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    let active = true;
    void resolveSession().then((resolved) => {
      if (!active) return;
      setUser(resolved);
      setStatus(resolved ? "authenticated" : "anonymous");
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({ status, user, refresh, signOut }),
    [status, user, refresh, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
