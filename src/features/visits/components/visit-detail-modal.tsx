"use client";

import { LeadEngagementPanel } from "@/components/lead-engagement-panel";
import { UnplannedBadge } from "@/components/unplanned-badge";
import { FieldPulseLoader } from "@/components/ui/fieldpulse-loader";
import { Modal } from "@/components/ui/modal";
import { pairLabel } from "@/lib/pairs";
import { useSession } from "@/lib/session";
import { useVisit } from "../hooks";
import { shownStatus } from "../week";
import { AttendanceCard } from "./attendance-card";
import { VisitStatusBadge } from "./visit-status-badge";

export function VisitDetailModal({ visitId, onClose }: { visitId: string; onClose: () => void }) {
  const { user } = useSession();
  const { data: visit, isPending, isError, error } = useVisit(visitId);

  return (
    <Modal
      onClose={onClose}
      label={visit ? `Visit to ${visit.lead.companyName}` : "Visit"}
      header={
        visit ? (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                {visit.lead.companyName}
              </h2>
              {visit.lead.address && (
                <p className="mt-0.5 truncate text-sm text-muted">{visit.lead.address}</p>
              )}
              <p className="mt-0.5 text-xs text-muted">{pairLabel(visit)}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <UnplannedBadge planId={visit.planId} />
              <VisitStatusBadge status={shownStatus(visit, user?.id)} />
            </div>
          </div>
        ) : (
          <h2 className="text-lg font-semibold tracking-tight">Visit</h2>
        )
      }
    >
      {isPending && <FieldPulseLoader />}

      {isError && (
        <p role="alert" className="text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load this visit"}
        </p>
      )}

      {visit && (
        <div className="space-y-4">
          <LeadEngagementPanel leadId={visit.leadId} />

          {visit.attendances.every((attendance) => !attendance.checkInAt) && (
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
      )}
    </Modal>
  );
}
