"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useState } from "react";
import { useTeamVisits } from "../hooks";
import type { VisitStatus } from "../types";
import { VisitList } from "./visit-list";

const FILTERS: Array<{ label: string; status?: VisitStatus }> = [
  { label: "All" },
  { label: "Planned", status: "PLANNED" },
  { label: "On site", status: "CHECKED_IN" },
  { label: "Completed", status: "COMPLETED" },
];

export function TeamVisitsScreen() {
  const [status, setStatus] = useState<VisitStatus | undefined>(undefined);
  const { data, isPending, isError, error } = useTeamVisits({ status });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <Breadcrumb segments={[{ label: "Team visits" }]} />

      <header>
        <Link href="/" className="text-sm underline">
          My visits
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Team visits</h1>
          <Link href="/manager/plans" className="text-sm underline">
            Weekly plan →
          </Link>
        </div>
        <p className="text-sm text-muted">Everyone in your reporting line.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => setStatus(filter.status)}
            aria-pressed={status === filter.status}
            className={`min-h-11 rounded-lg border px-3 text-sm ${
              status === filter.status ? "border-chip-active-edge text-chip-active-edge" : "border-border text-muted"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isPending && <p className="text-sm text-muted">Loading…</p>}
      {isError && (
        <p role="alert" className="text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load team visits"}
        </p>
      )}
      {data && (
        <VisitList
          visits={data.visits}
          showPair
          emptyMessage="No visits for your team in this view."
        />
      )}
    </main>
  );
}
