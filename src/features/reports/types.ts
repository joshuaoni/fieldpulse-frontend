import type { VisitOutcome } from "@/lib/outcomes";
import type { PairMember } from "@/lib/pairs";

export interface TeamMetric {
  value: number;
  previous: number | null;
}

export interface TeamOverview {
  totalVisits: TeamMetric;
  planAdherence: TeamMetric;
  conversionRate: TeamMetric;
  averageDwellMinutes: TeamMetric;
}

export interface FieldReport {
  id: string;
  visitId: string;
  notes: string;
  outcome: VisitOutcome | null;
  submittedAt: string;
  lead: { id: string; companyName: string; sector: string | null };
  pair: { id: string; name: string | null; members: PairMember[] };
  flagged: boolean;
}

export interface ReportPage {
  reports: FieldReport[];
  sectors: string[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export type DateRange = "TODAY" | "WEEK" | "MONTH";

export const DATE_RANGE_LABEL: Record<DateRange, string> = {
  TODAY: "Today",
  WEEK: "This week",
  MONTH: "This month",
};

export interface ReportFilters {
  range: DateRange;
  outcomes: VisitOutcome[];
  sectors: string[];
  search?: string;
}

export const NO_FILTERS: ReportFilters = { range: "MONTH", outcomes: [], sectors: [] };

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function windowOf(range: DateRange, now = new Date()): { from: string; to: string } {
  const today = startOfDay(now);
  const to = new Date(today);
  to.setUTCDate(to.getUTCDate() + 1);

  const from = new Date(today);
  if (range === "WEEK") from.setUTCDate(from.getUTCDate() - ((from.getUTCDay() + 6) % 7));
  if (range === "MONTH") from.setUTCDate(1);

  return { from: from.toISOString(), to: to.toISOString() };
}

export const filterCount = (filters: ReportFilters): number =>
  filters.outcomes.length + filters.sectors.length;
