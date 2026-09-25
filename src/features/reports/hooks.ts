"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import * as reportsApi from "./api";
import type { DateRange, ReportFilters } from "./types";

export const reportKeys = {
  overview: (range: DateRange) => ["reports", "overview", range] as const,
  list: (filters: ReportFilters, page: number) => ["reports", "list", filters, page] as const,
};

export function useTeamOverview(range: DateRange) {
  return useQuery({
    queryKey: reportKeys.overview(range),
    queryFn: () => reportsApi.fetchTeamOverview(range),
    staleTime: 5 * 60_000,
  });
}

export function useReports(filters: ReportFilters, page: number) {
  return useQuery({
    queryKey: reportKeys.list(filters, page),
    queryFn: () => reportsApi.fetchReports(filters, page),
    staleTime: 60_000,
  });
}

export function useExportReports() {
  return useMutation({
    mutationFn: async (filters: ReportFilters) => {
      const blob = await reportsApi.exportReports(filters);
      const url = URL.createObjectURL(blob);

      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `field-reports-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
  });
}
