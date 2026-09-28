import { describeConcerns, type CheckIn } from "@/features/check-ins/types";
import type { Visit } from "@/features/visits/types";
import { pairLabel } from "@/lib/pairs";
import type { SalesPair } from "@/features/pairs/types";

export type AttentionKind = "FLAGGED" | "MISSED";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  at: string;
  href: string;
}

export const ATTENTION_LABEL: Record<AttentionKind, string> = {
  FLAGGED: "Flagged",
  MISSED: "Missed",
};

export const ATTENTION_BADGE: Record<AttentionKind, string> = {
  FLAGGED: "bg-danger/10 text-danger",
  MISSED: "bg-warning/10 text-warning-fg",
};

const fromCheckIn = (checkIn: CheckIn): AttentionItem => ({
  id: `flagged:${checkIn.attendanceId}`,
  kind: "FLAGGED",
  title: checkIn.lead.companyName,
  detail: `${checkIn.rep.firstName} — ${describeConcerns(checkIn)}`,
  at: checkIn.checkInAt,
  href: `/visits/${checkIn.visitId}`,
});

const fromVisit = (visit: Visit): AttentionItem => ({
  id: `missed:${visit.id}`,
  kind: "MISSED",
  title: visit.lead.companyName,
  detail: `${pairLabel(visit)} — nobody checked in`,
  at: visit.scheduledFor ?? visit.updatedAt,
  href: `/visits/${visit.id}`,
});

export function needsAttention({
  flagged,
  visits,
}: {
  flagged: CheckIn[];
  visits: Visit[];
}): AttentionItem[] {
  const items = [
    ...flagged.map(fromCheckIn),
    ...visits.filter((visit) => visit.status === "MISSED").map(fromVisit),
  ];

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** A pair counts as out if anyone has started their day. */
export const hasStarted = (pair: SalesPair): boolean =>
  pair.day.current !== null || pair.day.progress.done > 0;

export function dayTotals(pairs: SalesPair[]): { done: number; total: number } {
  return pairs.reduce(
    (running, pair) => ({
      done: running.done + pair.day.progress.done,
      total: running.total + pair.day.progress.total,
    }),
    { done: 0, total: 0 },
  );
}
