"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMyFieldRole } from "@/features/field-roles/hooks";
import { useSession } from "@/lib/session";

/**
 * Gate for any screen that should be reachable only by a field manager.
 */
export function RequireFieldManager({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useSession();
  const fieldRole = useMyFieldRole();

  const isManager = fieldRole.data?.fieldRole === "FIELD_MANAGER";
  const knownNotManager = fieldRole.isSuccess && !isManager;

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
    else if (knownNotManager) router.replace("/");
  }, [status, knownNotManager, router]);

  if (status !== "authenticated" || knownNotManager) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  if (fieldRole.isError) {
    return (
      <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted">Could not confirm your access. Please try again.</p>
        <button
          type="button"
          onClick={() => fieldRole.refetch()}
          className="text-sm font-medium text-brand underline"
        >
          Retry
        </button>
      </main>
    );
  }

  if (fieldRole.isPending || !isManager) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
