"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCheckIns, type CheckInFilters, type CheckInPage } from "./api";

export const checkInKeys = {
  list: (filters: CheckInFilters) => ["check-ins", filters] as const,
};

export function useCheckIns(filters: CheckInFilters) {
  return useQuery<CheckInPage>({
    queryKey: checkInKeys.list(filters),
    queryFn: () => fetchCheckIns(filters),
    staleTime: 2 * 60_000,
  });
}
