import { api } from "@/lib/api-client";
import type { ChatwootSyncResult, LeadEngagement } from "./types";

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
