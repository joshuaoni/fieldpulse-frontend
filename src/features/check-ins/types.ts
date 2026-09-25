import type { PairMember } from "@/lib/pairs";
import type { VisitOutcome } from "@/lib/outcomes";

export type CheckInStatus = "FLAGGED" | "PENDING" | "VERIFIED";

export interface CheckInReport {
  notes: string;
  outcome: VisitOutcome | null;
  submittedAt: string;
  by: { id: string; firstName: string; lastName: string };
}

export type CheckInConcern =
  | "FAR_FROM_ADDRESS"
  | "IMPRECISE_FIX"
  | "NO_LOCATION"
  | "LEFT_FROM_ELSEWHERE"
  | "IMPRECISE_DEPARTURE"
  | "NO_DEPARTURE_LOCATION";

export interface CheckIn {
  attendanceId: string;
  visitId: string;
  status: CheckInStatus;
  concerns: CheckInConcern[];
  pairId: string;
  pair?: { id: string; name: string | null; members?: PairMember[] };
  lead: { id: string; companyName: string; address: string | null };
  rep: { id: string; firstName: string; lastName: string };
  checkInAt: string;
  photoUrl: string | null;
  distanceM: number | null;
  departureDistanceM: number | null;
  accuracyM: number | null;
  departureAccuracyM: number | null;
  dayProgress: { done: number; total: number };
  report: CheckInReport | null;
}

export interface CheckInCounts {
  all: number;
  flagged: number;
  pending: number;
  verified: number;
}

export const STATUS_LABEL: Record<CheckInStatus, string> = {
  FLAGGED: "Flagged",
  PENDING: "Pending",
  VERIFIED: "Verified",
};

export function describeConcerns(checkIn: CheckIn): string {
  const parts = checkIn.concerns.map((concern) => {
    switch (concern) {
      case "FAR_FROM_ADDRESS":
        return `arrived ${formatDistance(checkIn.distanceM)} from the address`;
      case "IMPRECISE_FIX":
        return `arrival only accurate to ${formatDistance(checkIn.accuracyM)}`;
      case "NO_LOCATION":
        return "no arrival location";
      case "LEFT_FROM_ELSEWHERE":
        return `left from ${formatDistance(checkIn.departureDistanceM)} away`;
      case "IMPRECISE_DEPARTURE":
        return `departure only accurate to ${formatDistance(checkIn.departureAccuracyM)}`;
      case "NO_DEPARTURE_LOCATION":
        return "no departure location";
    }
  });

  return parts.join(" · ");
}

export function formatDistance(metres: number | null): string {
  if (metres === null) return "unknown";
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

export function describeProgress({ dayProgress }: CheckIn): string | null {
  if (!dayProgress.total) return null;

  const left = dayProgress.total - dayProgress.done;
  return left === 0
    ? `${dayProgress.done} of ${dayProgress.total} completed`
    : `${dayProgress.done} of ${dayProgress.total} visits done`;
}
