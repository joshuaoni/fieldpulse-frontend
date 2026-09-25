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

export function outcomeLabel(outcome: string | null): string | null {
  if (!outcome) return null;
  return OUTCOME_LABEL[outcome as VisitOutcome] ?? outcome;
}
