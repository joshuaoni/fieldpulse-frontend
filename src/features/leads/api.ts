import { api } from "@/lib/api-client";
import type {
  ChatwootSyncResult,
  DiscoveryStarted,
  EnrichmentPreview,
  DiscoveryTick,
  LeadEngagement,
  LeadPage,
  PassSummary,
  SearchTarget,
  SearchTargetsResponse,
} from "./types";

export async function fetchLeadEngagement(leadId: string): Promise<LeadEngagement> {
  const { engagement } = await api<{ engagement: LeadEngagement }>(
    `/api/leads/${leadId}/engagement`,
  );
  return engagement;
}

export async function fetchLeadEngagementByChatwootContact(
  contactId: string,
): Promise<LeadEngagement> {
  const { engagement } = await api<{ engagement: LeadEngagement }>(
    `/api/leads/by-chatwoot-contact/${contactId}/engagement`,
  );
  return engagement;
}

export async function syncChatwoot(leadId: string): Promise<ChatwootSyncResult> {
  const { sync } = await api<{ sync: ChatwootSyncResult }>(`/api/leads/${leadId}/chatwoot-sync`, {
    method: "POST",
  });
  return sync;
}

export interface LeadFilters {
  page?: number;
  search?: string;
  onlyNew?: boolean;
}

export async function fetchLeads(filters: LeadFilters = {}): Promise<LeadPage> {
  const query = new URLSearchParams();
  if (filters.page && filters.page > 1) query.set("page", String(filters.page));
  if (filters.search) query.set("search", filters.search);
  if (filters.onlyNew) query.set("onlyNew", "true");

  const suffix = query.toString();
  return api<LeadPage>(`/api/leads${suffix ? `?${suffix}` : ""}`);
}

export async function fetchSearchTargets(includeInactive = true): Promise<SearchTargetsResponse> {
  return api<SearchTargetsResponse>(
    `/api/leads/search-targets?includeInactive=${includeInactive}`,
  );
}

export async function previewEnrichment(): Promise<EnrichmentPreview> {
  const { preview } = await api<{ preview: EnrichmentPreview }>(
    "/api/leads/enrichment-runs/preview",
  );
  return preview;
}

export async function createSearchTarget(input: {
  query: string;
  area: string;
  sector?: string;
}): Promise<SearchTarget> {
  const { searchTarget } = await api<{ searchTarget: SearchTarget }>(
    "/api/leads/search-targets",
    { method: "POST", body: JSON.stringify(input) },
  );
  return searchTarget;
}

export async function setSearchTargetActive(
  id: string,
  isActive: boolean,
): Promise<SearchTarget> {
  const { searchTarget } = await api<{ searchTarget: SearchTarget }>(
    `/api/leads/search-targets/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ isActive }) },
  );
  return searchTarget;
}

export async function runSearchTarget(id: string): Promise<DiscoveryStarted> {
  const { started } = await api<{ started: DiscoveryStarted }>(
    `/api/leads/search-targets/${id}/discovery-runs`,
    { method: "POST" },
  );
  return started;
}

export async function collectDiscovery(): Promise<DiscoveryTick> {
  const { step } = await api<{ step: DiscoveryTick }>("/api/leads/discovery-runs/collect", {
    method: "POST",
  });
  return step;
}

export async function runEnrichment(): Promise<PassSummary> {
  const { summary } = await api<{ summary: PassSummary }>("/api/leads/enrichment-runs", {
    method: "POST",
  });
  return summary;
}
