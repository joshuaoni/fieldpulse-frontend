"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { useMyFieldRole } from "@/features/field-roles/hooks";
import { useSession } from "@/lib/session";
import { useMyVisits, useQueueFlush } from "../hooks";
import { PendingActionsBanner } from "./pending-actions-banner";
import { VisitList } from "./visit-list";

export function MyVisitsScreen() {
  const { user, signOut } = useSession();
  const fieldRole = useMyFieldRole();
  const { data, isPending, isError, error } = useMyVisits();

  // Replays anything recorded offline as soon as this screen mounts and again
  // whenever the connection returns.
  useQueueFlush();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <header className="flex items-center gap-3">
        <BrandMark className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight">My visits</h1>
          <p className="truncate text-sm text-muted">
            {user ? `${user.firstName} ${user.lastName}` : ""}
          </p>
        </div>
        <Button variant="secondary" onClick={signOut} className="text-sm">
          Sign out
        </Button>
      </header>

      <PendingActionsBanner />

      {fieldRole.data?.fieldRole === "FIELD_MANAGER" && (
        <Link href="/manager" className="text-sm text-brand underline">
          Team view
        </Link>
      )}

      {isPending && <p className="text-sm text-muted">Loading…</p>}
      {isError && (
        <p role="alert" className="text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load your visits"}
        </p>
      )}
      {data && <VisitList visits={data.visits} emptyMessage="No visits assigned to you yet." />}
    </main>
  );
}
