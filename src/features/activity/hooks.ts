"use client";

import { useQuery } from "@tanstack/react-query";
import * as activityApi from "./api";
import type { ActivityFilters } from "./types";

export const activityKeys = {
  list: (filters: ActivityFilters, page: number) => ["activity", filters, page] as const,
};

export function useActivity(filters: ActivityFilters, page: number) {
  return useQuery({
    queryKey: activityKeys.list(filters, page),
    queryFn: () => activityApi.fetchActivity(filters, page),
    staleTime: 30_000,
  });
}
