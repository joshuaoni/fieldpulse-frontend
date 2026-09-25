import Image from "next/image";
import { outcomeLabel } from "@/lib/outcomes";
import type { VisitAttendance } from "../types";
import { arrivedAt, leftAt } from "../time";
import { DeviceTimeNote } from "./device-time-note";

const stamp = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

/**
 * One rep's verified record: when they arrived, when they left, the photo they
 * took, and their own account of the visit.
 */
export function AttendanceCard({
  attendance,
  isYou,
  visitCreatedAt,
}: {
  attendance: VisitAttendance;
  isYou: boolean;
  visitCreatedAt?: string;
}) {
  const name = attendance.rep
    ? `${attendance.rep.firstName} ${attendance.rep.lastName}`
    : "Unknown rep";

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm font-medium">
        {name}
        {isYou && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}
      </h3>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted">Checked in</dt>
        <dd>
          {stamp(arrivedAt(attendance, visitCreatedAt))}
          <DeviceTimeNote
            verifiedAt={attendance.checkInAt}
            deviceAt={attendance.clientLocalCheckInAt}
          />
        </dd>
        <dt className="text-muted">Checked out</dt>
        <dd>
          {stamp(leftAt(attendance, visitCreatedAt))}
          <DeviceTimeNote
            verifiedAt={attendance.checkOutAt}
            deviceAt={attendance.clientLocalCheckOutAt}
          />
        </dd>
      </dl>

      {attendance.checkInPhotoUrl && (
        <Image
          src={attendance.checkInPhotoUrl}
          alt={`Taken by ${name} at check-in`}
          width={800}
          height={1066}
          unoptimized
          className="mt-4 w-full rounded-lg border border-border"
        />
      )}

      {attendance.report ? (
        <div className="mt-4 border-t border-border pt-4">
          {attendance.report.outcome && (
            <p className="text-sm font-medium">{outcomeLabel(attendance.report.outcome)}</p>
          )}
          <p className="mt-1 whitespace-pre-wrap text-sm">{attendance.report.notes}</p>
          <p className="mt-2 text-xs text-muted">
            Reported {new Date(attendance.report.submittedAt).toLocaleString()}
          </p>
        </div>
      ) : (
        attendance.checkOutAt && (
          <p className="mt-4 border-t border-border pt-4 text-sm text-muted">
            No report filed yet.
          </p>
        )
      )}
    </section>
  );
}
