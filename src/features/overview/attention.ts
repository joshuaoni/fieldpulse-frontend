import { describeConcerns, type CheckIn } from "@/features/check-ins/types";
import type { Visit } from "@/features/visits/types";
import { visitHref } from "@/features/visits/href";
import { pairLabel } from "@/lib/pairs";
import type { SalesPair } from "@/features/pairs/types";

export type AttentionKind = "FLAGGED" | "MISSED";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  at: string;
  visitId: string;
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
  visitId: checkIn.visitId,
});

const fromVisit = (visit: Visit): AttentionItem => ({
  id: `missed:${visit.id}`,
  kind: "MISSED",
  title: visit.lead.companyName,
  detail: `${pairLabel(visit)} — nobody checked in`,
  at: visit.scheduledFor ?? visit.updatedAt,
  visitId: visit.id,
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

export interface WorkedPair {
  pair: SalesPair;
  visits: number;
  last: { visitId: string; companyName: string; at: string };
}

/**
 * Which pairs worked in a past range, read off its check-ins.
 */
export function workedPairs(roster: SalesPair[], checkIns: CheckIn[]): WorkedPair[] {
  const byPair = new Map<string, { visits: Set<string>; last: CheckIn }>();

  for (const checkIn of checkIns) {
    const held = byPair.get(checkIn.pairId);
    if (!held) {
      byPair.set(checkIn.pairId, { visits: new Set([checkIn.visitId]), last: checkIn });
      continue;
    }
    held.visits.add(checkIn.visitId);
    if (checkIn.checkInAt > held.last.checkInAt) held.last = checkIn;
  }

  return roster
    .flatMap((pair) => {
      const held = byPair.get(pair.id);
      return held
        ? [
            {
              pair,
              visits: held.visits.size,
              last: {
                visitId: held.last.visitId,
                companyName: held.last.lead.companyName,
                at: held.last.checkInAt,
              },
            },
          ]
        : [];
    })
    .sort((a, b) => b.visits - a.visits);
}
