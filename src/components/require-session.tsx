"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/session";

/**
 * Gate for any screen that needs a signed-in user.
 */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
