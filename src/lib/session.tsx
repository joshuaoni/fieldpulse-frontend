"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchMe, logout as clearSession } from "@/features/auth/api";
import type { AuthUser } from "@/features/auth/types";
import { hasFieldAccess } from "./field-role";
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

    if (!(await hasFieldAccess())) {
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
  const queryClient = useQueryClient();
  const signedInAs = useRef<string | null | undefined>(undefined);

  const adopt = useCallback(
    (resolved: AuthUser | null) => {
      const id = resolved?.id ?? null;
      if (signedInAs.current !== undefined && signedInAs.current !== id) queryClient.clear();
      signedInAs.current = id;

      setUser(resolved);
      setStatus(resolved ? "authenticated" : "anonymous");
    },
    [queryClient],
  );

  const refresh = useCallback(async () => {
    adopt(await resolveSession());
  }, [adopt]);

  const signOut = useCallback(() => {
    clearSession();
    adopt(null);
  }, [adopt]);

  useEffect(() => {
    let active = true;
    void resolveSession().then((resolved) => {
      if (active) adopt(resolved);
    });
    return () => {
      active = false;
    };
  }, [adopt]);

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
