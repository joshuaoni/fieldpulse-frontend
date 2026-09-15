import { api } from "@/lib/api-client";
import type { Visit, VisitFilters, VisitListResponse } from "./types";

/**
 * The deadline on the three writes a rep makes in the field.
 */
const FIELD_WRITE_TIMEOUT_MS = 20_000;

function toQuery(filters: VisitFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchMyVisits(filters: VisitFilters = {}): Promise<VisitListResponse> {
  return api<VisitListResponse>(`/api/visits${toQuery(filters)}`);
}

export async function fetchTeamVisits(filters: VisitFilters = {}): Promise<VisitListResponse> {
  return api<VisitListResponse>(`/api/manager/visits${toQuery(filters)}`);
}

export async function fetchVisit(id: string): Promise<Visit> {
  const { visit } = await api<{ visit: Visit }>(`/api/visits/${id}`);
  return visit;
}

export interface CheckInPayload {
  visitId: string;
  lat: number;
  lng: number;
  photo: Blob;
  clientLocalCheckInAt: string;
}

export async function checkIn({
  visitId,
  lat,
  lng,
  photo,
  clientLocalCheckInAt,
}: CheckInPayload): Promise<Visit> {
  const form = new FormData();
  form.set("lat", String(lat));
  form.set("lng", String(lng));
  form.set("clientLocalCheckInAt", clientLocalCheckInAt);
  form.set("photo", photo, "check-in.jpg");

  const { visit } = await api<{ visit: Visit }>(`/api/visits/${visitId}/check-in`, {
    method: "POST",
    body: form,
    timeoutMs: FIELD_WRITE_TIMEOUT_MS,
  });
  return visit;
}

export interface CheckOutPayload {
  visitId: string;
  lat: number;
  lng: number;
  clientLocalCheckOutAt: string;
}

export async function checkOut({
  visitId,
  lat,
  lng,
  clientLocalCheckOutAt,
}: CheckOutPayload): Promise<Visit> {
  const { visit } = await api<{ visit: Visit }>(`/api/visits/${visitId}/check-out`, {
    method: "POST",
    body: JSON.stringify({ lat, lng, clientLocalCheckOutAt }),
    timeoutMs: FIELD_WRITE_TIMEOUT_MS,
  });
  return visit;
}

export interface ReportPayload {
  visitId: string;
  notes: string;
  outcome?: string;
}

export async function submitReport({ visitId, notes, outcome }: ReportPayload): Promise<Visit> {
  const { visit } = await api<{ visit: Visit }>(`/api/visits/${visitId}/report`, {
    method: "POST",
    body: JSON.stringify({ notes, outcome }),
    timeoutMs: FIELD_WRITE_TIMEOUT_MS,
  });
  return visit;
}
