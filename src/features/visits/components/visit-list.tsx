"use client";

import Link from "next/link";
import { pairLabel } from "@/lib/pairs";
import type { Visit } from "../types";
import { VisitStatusBadge } from "./visit-status-badge";

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

function progress(visit: Visit): string {
  const arrived = visit.attendances.filter((attendance) => attendance.checkInAt);
  if (!arrived.length) return "Not started";

  const earliest = arrived.map((attendance) => attendance.checkInAt!).sort()[0];
  const stillOnSite = arrived.filter((attendance) => !attendance.checkOutAt).length;

  const who = arrived.length === 1 ? "1 rep" : `${arrived.length} reps`;
  const tail = stillOnSite ? `${stillOnSite} still on site` : "all checked out";
  return `${who} from ${time(earliest)} · ${tail}`;
}

export function VisitList({
  visits,
  emptyMessage,
  showPair = false,
}: {
  visits: Visit[];
  emptyMessage: string;
  showPair?: boolean;
}) {
  if (visits.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-strong p-6 text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {visits.map((visit) => (
        <li key={visit.id}>
          <Link
            href={`/visits/${visit.id}`}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{visit.lead.companyName}</p>
              <p className="mt-0.5 text-xs text-muted">
                {showPair ? `${pairLabel(visit)} · ` : ""}
                {progress(visit)}
              </p>
            </div>
            <VisitStatusBadge status={visit.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
