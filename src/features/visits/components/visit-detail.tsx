"use client";

import { pairLabel } from "@/lib/pairs";
import { useSession } from "@/lib/session";
import { useVisit } from "../hooks";
import { myAttendance } from "../types";
import { AttendanceCard } from "./attendance-card";
import { VisitActions } from "./visit-actions";
import { VisitStatusBadge } from "./visit-status-badge";

export function VisitDetail({ visitId }: { visitId: string }) {
  const { user } = useSession();
  const { data: visit, isPending, isError, error } = useVisit(visitId);

  if (isPending) return <p className="text-sm text-muted">Loading…</p>;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error instanceof Error ? error.message : "Could not load this visit"}
      </p>
    );
  }

  const iAmOnThisVisit = Boolean(user && myAttendance(visit, user.id));
  const nobodyHasArrived = visit.attendances.every((attendance) => !attendance.checkInAt);

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {visit.lead.companyName}
          </h1>
          {visit.lead.address && <p className="text-sm text-muted">{visit.lead.address}</p>}
          <p className="text-xs text-muted">{pairLabel(visit)}</p>
        </div>
        <VisitStatusBadge status={visit.status} />
      </header>

      {/* A manager viewing someone else's visit gets no action panel. */}
      {user && <VisitActions visit={visit} repId={user.id} />}

      {nobodyHasArrived && !iAmOnThisVisit && (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">
          Nobody has checked in to this visit yet.
        </p>
      )}

      {visit.attendances
        .filter((attendance) => attendance.checkInAt)
        .map((attendance) => (
          <AttendanceCard
            key={attendance.id}
            attendance={attendance}
            isYou={attendance.repId === user?.id}
          />
        ))}

      <p className="text-xs text-muted">
        Arrival and departure times are assigned by the server when each record reaches it — never
        taken from a phone. A device time is shown only to explain a delay.
      </p>
    </div>
  );
}
