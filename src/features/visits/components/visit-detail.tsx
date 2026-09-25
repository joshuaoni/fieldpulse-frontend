"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { useMyFieldRole } from "@/features/field-roles/hooks";
import { pairLabel } from "@/lib/pairs";
import { useSession } from "@/lib/session";
import { useVisit } from "../hooks";
import { myAttendance } from "../types";
import { AttendanceCard } from "./attendance-card";
import { ReportSubmitted } from "./report-submitted";
import { VisitActions } from "./visit-actions";
import { VisitStatusBadge } from "./visit-status-badge";
import { LeadEngagementPanel } from "@/features/leads/components/lead-engagement-panel";

export function VisitDetail({ visitId }: { visitId: string }) {
  const [justSubmitted, setJustSubmitted] = useState<{ queued: boolean } | null>(null);
  const { user } = useSession();
  const fieldRole = useMyFieldRole();
  const { data: visit, isPending, isError, error } = useVisit(visitId);

  if (isPending) return <p className="text-sm text-muted">Loading…</p>;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error instanceof Error ? error.message : "Could not load this visit"}
      </p>
    );
  }

  if (justSubmitted) {
    return (
      <ReportSubmitted
        companyName={visit.lead.companyName}
        queued={justSubmitted.queued}
      />
    );
  }

  const iAmOnThisVisit = Boolean(user && myAttendance(visit, user.id));
  const nobodyHasArrived = visit.attendances.every((attendance) => !attendance.checkInAt);

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <MapPin size={20} aria-hidden className="mt-1 shrink-0 text-muted" />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {visit.lead.companyName}
          </h1>
          {visit.lead.address && <p className="text-sm text-muted">{visit.lead.address}</p>}
          <p className="mt-0.5 text-xs text-muted">{pairLabel(visit)}</p>
        </div>

        <VisitStatusBadge status={visit.status} />
      </header>

      {/* A manager viewing someone else's visit gets no action panel. */}
      {user && <VisitActions visit={visit} repId={user.id} onSubmitted={setJustSubmitted} />}

      {fieldRole.data?.fieldRole === "FIELD_MANAGER" && (
        <LeadEngagementPanel leadId={visit.leadId} />
      )}

      {nobodyHasArrived && !iAmOnThisVisit && (
        <p className="rounded-xl border border-dashed border-border-strong p-6 text-sm text-muted">
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
            visitCreatedAt={visit.createdAt}
          />
        ))}
    </div>
  );
}
