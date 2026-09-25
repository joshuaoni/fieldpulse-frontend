"use client";

import { Modal } from "@/components/ui/modal";
import { OUTCOME_LABEL, type VisitOutcome } from "@/lib/outcomes";
import { pairLabel } from "@/lib/pairs";
import {
  STATUS_LABEL,
  describeConcerns,
  type CheckIn,
  type CheckInStatus,
} from "../types";

const BADGE = "inline-flex rounded-md px-2.5 py-1 text-xs/none font-medium";

const GOOD = "bg-success-bg text-success-fg";
const NEUTRAL = "bg-sunken text-muted";

const STATUS_BADGE: Record<CheckInStatus, string> = {
  FLAGGED: "bg-danger/10 text-danger",
  PENDING: "bg-amber-500/10 text-amber-700",
  VERIFIED: GOOD,
};

const OUTCOME_BADGE: Record<VisitOutcome, string> = {
  INTERESTED: GOOD,
  CLOSED: NEUTRAL,
  NOT_VIABLE: NEUTRAL,
  FOLLOW_UP_NEEDED: NEUTRAL,
  OTHER: NEUTRAL,
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

export function CheckInDetail({ checkIn, onClose }: { checkIn: CheckIn; onClose: () => void }) {
  const { report } = checkIn;

  return (
    <Modal
      onClose={onClose}
      label={`Check-in at ${checkIn.lead.companyName}`}
      header={
        <div className="flex items-start gap-4">
          <div className="min-w-0 max-w-[60%]">
            <h2 className="truncate text-lg font-semibold tracking-tight">
              {checkIn.lead.companyName}
            </h2>
            {checkIn.lead.address && (
              <p className="mt-0.5 truncate text-sm text-muted">{checkIn.lead.address}</p>
            )}
          </div>

          <div className="min-w-0 shrink-0 border-l border-border pl-4">
            <p className="text-lg font-semibold tracking-tight">Outcome</p>
            <p className="mt-1.5">
              {report?.outcome ? (
                <span className={`${BADGE} ${OUTCOME_BADGE[report.outcome]}`}>
                  {OUTCOME_LABEL[report.outcome]}
                </span>
              ) : (
                <span className="text-sm text-muted">Not recorded</span>
              )}
            </p>
          </div>
        </div>
      }
    >
      {checkIn.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={checkIn.photoUrl}
          alt={`Check-in photo taken at ${checkIn.lead.companyName}`}
          className="aspect-[3/2] w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex aspect-[3/2] w-full items-center justify-center rounded-xl bg-sunken text-sm text-muted">
          No photo was taken
        </div>
      )}

      <h3 className="mt-6 font-semibold">Submitted report</h3>

      <div className="mt-3 border-b border-border pb-5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate font-semibold">{pairLabel(checkIn)}</p>
          <span className={`${BADGE} shrink-0 ${STATUS_BADGE[checkIn.status]}`}>
            {STATUS_LABEL[checkIn.status]}
          </span>
        </div>

        {checkIn.status === "FLAGGED" && (
          <p className="mt-1 text-sm text-danger">{describeConcerns(checkIn)}</p>
        )}

        <p className="mt-1 text-sm text-muted">
          Checked in by {checkIn.rep.firstName}
          {report && ` · written up by ${report.by.firstName}`}
        </p>

        {report ? (
          <>
            <p className="mt-2 text-sm">{report.notes}</p>
            <p className="mt-3 text-right text-sm text-muted">{day(report.submittedAt)}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Neither rep has written this visit up yet.</p>
        )}
      </div>
    </Modal>
  );
}
