import { api } from "@/lib/api-client";
import { PAGE_SIZE } from "@/components/ui/pager";
import type { ActivityFilters, ActivityPage } from "./types";

export async function fetchActivity(
  filters: ActivityFilters,
  page: number,
): Promise<ActivityPage> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });

  for (const action of filters.actions) query.append("action", action);
  for (const entityType of filters.entityTypes) query.append("entityType", entityType);
  if (filters.search) query.set("search", filters.search);

  return api<ActivityPage>(`/api/activity?${query}`);
}
