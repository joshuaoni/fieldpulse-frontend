import { api, apiBlob } from "@/lib/api-client";
import { windowOf, type ReportFilters, type ReportPage, type TeamOverview } from "./types";

function params(filters: ReportFilters): URLSearchParams {
  const { from, to } = windowOf(filters.range);
  const query = new URLSearchParams({ from, to });

  for (const outcome of filters.outcomes) query.append("outcome", outcome);
  for (const sector of filters.sectors) query.append("sector", sector);
  if (filters.search) query.set("search", filters.search);

  return query;
}

export async function fetchTeamOverview(range: ReportFilters["range"]): Promise<TeamOverview> {
  const { from, to } = windowOf(range);
  const { overview } = await api<{ overview: TeamOverview }>(
    `/api/reports/overview?${new URLSearchParams({ from, to })}`,
  );
  return overview;
}

export async function fetchReports(filters: ReportFilters, page: number): Promise<ReportPage> {
  const query = params(filters);
  if (page > 1) query.set("page", String(page));

  return api<ReportPage>(`/api/reports?${query}`);
}

export function exportReports(filters: ReportFilters): Promise<Blob> {
  return apiBlob(`/api/reports/export?${params(filters)}`);
}
