import { api } from "@/lib/api-client";
import type { CheckIn, CheckInCounts, CheckInStatus } from "./types";

export interface CheckInFilters {
  from?: string;
  to?: string;
  status?: CheckInStatus;
  pairId?: string;
}

export interface CheckInPage {
  counts: CheckInCounts;
  checkIns: CheckIn[];
}

export async function fetchCheckIns(filters: CheckInFilters = {}): Promise<CheckInPage> {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value) as Array<[string, string]>,
  ).toString();

  return api<CheckInPage>(`/api/manager/check-ins${query ? `?${query}` : ""}`);
}
