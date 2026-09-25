"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as leadsApi from "./api";

export const leadKeys = {
  all: () => ["leads"] as const,
  list: (filters: leadsApi.LeadFilters) => ["leads", "list", filters] as const,
  searchTargets: () => ["leads", "search-targets"] as const,
  enrichmentPreview: () => ["leads", "enrichment-preview"] as const,
  engagement: (leadId: string) => ["leads", "engagement", leadId] as const,
  engagementByContact: (contactId: string) =>
    ["leads", "engagement", "by-contact", contactId] as const,
};

export function useLeadEngagement(leadId: string) {
  return useQuery({
    queryKey: leadKeys.engagement(leadId),
    queryFn: () => leadsApi.fetchLeadEngagement(leadId),
  });
}

export function useLeadEngagementByChatwootContact(contactId: string | null) {
  return useQuery({
    queryKey: leadKeys.engagementByContact(contactId ?? ""),
    queryFn: () => leadsApi.fetchLeadEngagementByChatwootContact(contactId as string),
    enabled: Boolean(contactId),
  });
}

export function useSyncChatwoot(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leadsApi.syncChatwoot(leadId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.engagement(leadId) });
    },
  });
}

export function useLeads(filters: leadsApi.LeadFilters) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => leadsApi.fetchLeads(filters),
    staleTime: 60_000,
  });
}

export function useSearchTargets() {
  return useQuery({
    queryKey: leadKeys.searchTargets(),
    queryFn: () => leadsApi.fetchSearchTargets(),
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.data?.searchTargets.some((target) => target.apifyRunId) ? 8_000 : false,
  });
}

/** Everything on this screen is downstream of a run, so all of it refetches. */
function useTargetMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: leadKeys.all() }),
  });
}

export function useCreateSearchTarget() {
  return useTargetMutation(leadsApi.createSearchTarget);
}

export function useRunSearchTarget() {
  return useTargetMutation(leadsApi.runSearchTarget);
}

export function useSetSearchTargetActive() {
  return useTargetMutation(({ id, isActive }: { id: string; isActive: boolean }) =>
    leadsApi.setSearchTargetActive(id, isActive),
  );
}

export function useEnrichmentPreview(enabled: boolean) {
  return useQuery({
    queryKey: leadKeys.enrichmentPreview(),
    queryFn: leadsApi.previewEnrichment,
    enabled,
    staleTime: 0,
  });
}

export function useRunEnrichment() {
  return useTargetMutation(leadsApi.runEnrichment);
}

export function useCollectDiscovery() {
  return useTargetMutation(leadsApi.collectDiscovery);
}
