export type VisitOutcome =
  | "INTERESTED"
  | "CLOSED"
  | "NOT_VIABLE"
  | "FOLLOW_UP_NEEDED"
  | "OTHER";

export const OUTCOME_LABEL: Record<VisitOutcome, string> = {
  INTERESTED: "Interested",
  CLOSED: "Closed",
  NOT_VIABLE: "Not viable",
  FOLLOW_UP_NEEDED: "Follow-up needed",
  OTHER: "Other",
};

export const OUTCOMES = Object.keys(OUTCOME_LABEL) as VisitOutcome[];

export const OUTCOME_TONE: Record<VisitOutcome, string> = {
  INTERESTED: "bg-success-bg text-success-fg",
  CLOSED: "bg-success-bg text-success-fg",
  FOLLOW_UP_NEEDED: "bg-warning/10 text-warning-fg",
  NOT_VIABLE: "bg-danger/10 text-danger",
  OTHER: "bg-sunken text-muted",
};

export function outcomeLabel(outcome: string | null): string | null {
  if (!outcome) return null;
  return OUTCOME_LABEL[outcome as VisitOutcome] ?? outcome;
}
