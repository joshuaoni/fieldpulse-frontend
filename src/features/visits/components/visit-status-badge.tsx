import type { VisitStatus } from "../types";

const label: Record<VisitStatus, string> = {
  PLANNED: "Planned",
  CHECKED_IN: "On site",
  COMPLETED: "Completed",
  MISSED: "Missed",
};

const tone: Record<VisitStatus, string> = {
  PLANNED: "border-border text-muted",
  CHECKED_IN: "border-chip-active-edge text-chip-active-edge",
  COMPLETED: "border-border text-foreground",
  MISSED: "border-danger text-danger",
};

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tone[status]}`}>
      {label[status]}
    </span>
  );
}
