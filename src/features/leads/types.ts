import type { VisitOutcome } from "@/lib/outcomes";
import type { PairMember } from "@/lib/pairs";

export type VisitStatus = "PLANNED" | "CHECKED_IN" | "COMPLETED" | "MISSED";

export interface EngagementVisit {
  id: string;
  scheduledFor: string | null;
  status: VisitStatus;
  outcome: VisitOutcome | null;
  submittedAt: string | null;
  notes: string | null;
  pair: { id: string; name: string | null; members: PairMember[] };
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

export type LeadSource = "SPREADSHEET_SEED" | "APOLLO" | "APIFY";

export const SOURCE_LABEL: Record<LeadSource, string> = {
  SPREADSHEET_SEED: "Spreadsheet",
  APOLLO: "Apollo",
  APIFY: "Apify",
};

export interface LeadFieldSource {
  fieldName: string;
  source: LeadSource;
  fetchedAt: string;
}

export type LeadVisitState =
  | VisitOutcome
  | "FLAGGED"
  | "IN_PROGRESS"
  | "PLANNED"
  | "AWAITING_REPORT"
  | "MISSED";

export interface LeadLastVisit {
  visitId: string;
  visitedAt: string | null;
  scheduledFor: string | null;
  state: LeadVisitState;
  flagged: boolean;
}

export interface Lead {
  id: string;
  companyName: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  sector: string | null;
  chatwootContactId: string | null;
  lastEnrichedAt: string | null;
  isActive: boolean;
  createdAt: string;
  fieldSources: LeadFieldSource[];
  lastVisit: LeadLastVisit | null;
  isNew: boolean;
}

/** The most recent discovery run, and what has arrived since it began. */
export interface DiscoverySummary {
  startedAt: string;
  at: string;
  newLeads: number;
}

export interface LeadPage {
  leads: Lead[];
  discovery: DiscoverySummary | null;
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface SearchTarget {
  id: string;
  query: string;
  area: string;
  sector: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStartedAt: string | null;
  lastRunNewLeads: number | null;
  lastRunError: string | null;
  lastRunCapped: boolean;
  apifyRunId: string | null;
  apifyRunStartedAt: string | null;
  createdAt: string;
}

export function sourcesOf(lead: Lead): LeadSource[] {
  return [...new Set(lead.fieldSources.map((field) => field.source))];
}

export interface PassSummary {
  considered: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  cappedAt?: number;
}

export interface DiscoveryStarted {
  targetId: string;
  runId: string;
}

/** One step of the pipeline: something started, collected, or still running. */
export interface DiscoveryTick {
  collected?: { targetId: string; summary: PassSummary; retired: boolean };
  started?: DiscoveryStarted;
  waitingOn?: string;
}

export interface EnrichmentPreview {
  candidates: number;
  cappedAt?: number;
  configured: boolean;
}

export interface SearchTargetsResponse {
  searchTargets: SearchTarget[];
  maxResultsPerTarget: number;
}
