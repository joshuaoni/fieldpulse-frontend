import { OUTCOME_LABEL, type VisitOutcome } from "@/lib/outcomes";
import { SOURCE_LABEL, type LeadSource, type LeadVisitState } from "../types";

export const BADGE = "inline-flex rounded-md px-2.5 py-1 text-xs/none font-medium";

const GOOD = "bg-success-bg text-success-fg";
const WARN = "bg-amber-500/10 text-amber-700";
const BAD = "bg-danger/10 text-danger";
const LIVE = "bg-blue-500/10 text-blue-700";
const QUIET = "bg-sunken text-muted";

const STATE: Record<LeadVisitState, { label: string; tone: string }> = {
  INTERESTED: { label: OUTCOME_LABEL.INTERESTED, tone: GOOD },
  CLOSED: { label: OUTCOME_LABEL.CLOSED, tone: GOOD },
  FOLLOW_UP_NEEDED: { label: OUTCOME_LABEL.FOLLOW_UP_NEEDED, tone: WARN },
  NOT_VIABLE: { label: OUTCOME_LABEL.NOT_VIABLE, tone: WARN },
  OTHER: { label: OUTCOME_LABEL.OTHER, tone: QUIET },
  FLAGGED: { label: "Flagged", tone: BAD },
  IN_PROGRESS: { label: "In progress", tone: LIVE },
  PLANNED: { label: "Planned", tone: QUIET },
  AWAITING_REPORT: { label: "Awaiting report", tone: WARN },
  MISSED: { label: "Missed", tone: BAD },
};

export function StateBadge({ state }: { state: LeadVisitState }) {
  const { label, tone } = STATE[state];
  return <span className={`${BADGE} ${tone}`}>{label}</span>;
}

export function OutcomeBadge({ outcome }: { outcome: VisitOutcome }) {
  return <StateBadge state={outcome} />;
}

export function SourceChips({ sources }: { sources: LeadSource[] }) {
  if (!sources.length) return <span className="text-muted">—</span>;

  return (
    <span className="flex flex-wrap gap-1.5">
      {sources.map((source) => (
        <span key={source} className={`${BADGE} ${QUIET}`}>
          {SOURCE_LABEL[source]}
        </span>
      ))}
    </span>
  );
}
