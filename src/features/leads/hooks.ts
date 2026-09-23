"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as leadsApi from "./api";

export const leadKeys = {
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
