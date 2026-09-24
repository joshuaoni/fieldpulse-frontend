import type { VisitOutcome } from "@/lib/outcomes";

export type VisitStatus = "PLANNED" | "CHECKED_IN" | "COMPLETED" | "MISSED";

export interface EngagementVisit {
  id: string;
  scheduledFor: string | null;
  status: VisitStatus;
  outcome: VisitOutcome | null;
  submittedAt: string | null;
}

export interface LeadEngagement {
  leadId: string;
  chatwootContactId: string | null;
  chatwootContactUrl: string | null;
  visits: EngagementVisit[];
}

export interface ChatwootSyncResult {
  leadId: string;
  chatwootContactId: string;
  created: boolean;
}
