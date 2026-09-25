import { api } from "@/lib/api-client";
import type { ActivityFilters, ActivityPage } from "./types";

export async function fetchActivity(
  filters: ActivityFilters,
  pageSize: number,
): Promise<ActivityPage> {
  const query = new URLSearchParams({ pageSize: String(pageSize) });

  for (const action of filters.actions) query.append("action", action);
  for (const entityType of filters.entityTypes) query.append("entityType", entityType);
  if (filters.search) query.set("search", filters.search);

  return api<ActivityPage>(`/api/activity?${query}`);
}
