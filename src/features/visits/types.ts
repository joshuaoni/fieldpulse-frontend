export type VisitStatus = "PLANNED" | "CHECKED_IN" | "COMPLETED" | "MISSED";

export interface VisitReport {
  id: string;
  notes: string;
  outcome: string | null;
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
  /** Short-lived presigned URL. Expires — do not cache or forward it. */
  checkInPhotoUrl: string | null;
  /** Server-assigned. The only arrival time that may be shown as verified. */
  checkInAt: string | null;

  checkOutLat: number | null;
  checkOutLng: number | null;
  /** Server-assigned. The only departure time that may be shown as verified. */
  checkOutAt: string | null;

  /** Advisory — the phone's own clock. Never present this as verified. */
  clientLocalCheckInAt: string | null;
  clientLocalCheckOutAt: string | null;

  rep?: RepSummary;
  report?: VisitReport | null;
}

export interface Visit {
  id: string;
  leadId: string;
  pairId: string;
  status: VisitStatus;
  scheduledFor: string | null;
  planId: string | null;
  createdAt: string;
  updatedAt: string;
  pair?: { id: string; name: string | null };
  attendances: VisitAttendance[];
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
