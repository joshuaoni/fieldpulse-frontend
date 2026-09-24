import type { VisitOutcome } from "@/lib/outcomes";
import type { PairMember } from "@/lib/pairs";

export type VisitStatus = "PLANNED" | "CHECKED_IN" | "COMPLETED" | "MISSED";

export interface VisitReport {
  id: string;
  notes: string;
  outcome: VisitOutcome | null;
  submittedAt: string;
}

export interface RepSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface VisitAttendance {
  id: string;
  repId: string;

  checkInLat: number | null;
  checkInLng: number | null;
  checkInPhotoUrl: string | null;
  checkInAt: string | null;

  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutAt: string | null;

  clientLocalCheckInAt: string | null;
  clientLocalCheckOutAt: string | null;

  rep?: RepSummary;
  report?: VisitReport | null;
}

export interface SubmittedReport extends VisitReport {
  attendance?: { rep?: RepSummary };
}

export interface LeadSummary {
  id: string;
  companyName: string;
  address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Visit {
  id: string;
  leadId: string;
  lead: LeadSummary;
  pairId: string;
  status: VisitStatus;
  scheduledFor: string | null;
  planId: string | null;
  createdAt: string;
  updatedAt: string;
  pair?: { id: string; name: string | null; members?: PairMember[] };
  attendances: VisitAttendance[];
  report?: SubmittedReport | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface VisitListResponse {
  visits: Visit[];
  pagination: Pagination;
}

export interface VisitFilters {
  status?: VisitStatus;
  from?: string;
  to?: string;
  pairId?: string;
  repId?: string;
  page?: number;
  pageSize?: number;
}

/** This rep's own attendance, which is what drives their next action. */
export function myAttendance(visit: Visit, repId: string): VisitAttendance | undefined {
  return visit.attendances.find((attendance) => attendance.repId === repId);
}
