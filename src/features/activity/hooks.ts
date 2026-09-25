"use client";

import { useQuery } from "@tanstack/react-query";
import * as activityApi from "./api";
import type { ActivityFilters } from "./types";

export const activityKeys = {
  list: (filters: ActivityFilters, pageSize: number) =>
    ["activity", filters, pageSize] as const,
};

export function useActivity(filters: ActivityFilters, pageSize: number) {
  return useQuery({
    queryKey: activityKeys.list(filters, pageSize),
    queryFn: () => activityApi.fetchActivity(filters, pageSize),
    staleTime: 30_000,
  });
}
