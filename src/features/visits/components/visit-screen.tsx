"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PendingActionsBanner } from "./pending-actions-banner";
import { VisitDetail } from "./visit-detail";

/**
 * Reads the visit ID from `?id=` (see `../href.ts` for why it is a query
 * parameter) and renders the detail screen for it.
 */
export function VisitScreen() {
  const visitId = useSearchParams().get("id")?.trim() ?? "";

  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden px-4">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pt-8 pb-28">
        <Link
          href="/today"
          aria-label="Back to today"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        >
          <ChevronLeft size={18} aria-hidden />
        </Link>
        <PendingActionsBanner />
        {visitId ? (
          <VisitDetail visitId={visitId} />
        ) : (
          <p role="alert" className="text-sm text-danger">
            No visit selected.
          </p>
        )}
      </div>
    </main>
  );
}
