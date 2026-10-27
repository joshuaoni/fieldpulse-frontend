import type { VisitOutcome } from "@/lib/outcomes";
import type { DateRange } from "@/lib/date-range";
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

export interface ReportFilters {
  range: DateRange;
  outcomes: VisitOutcome[];
  sectors: string[];
  search?: string;
}

export const NO_FILTERS: ReportFilters = { range: { preset: "MONTH" }, outcomes: [], sectors: [] };

export const filterCount = (filters: ReportFilters): number =>
  filters.outcomes.length + filters.sectors.length;
