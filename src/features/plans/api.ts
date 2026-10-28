import { api } from "@/lib/api-client";
import type { CandidateLead, GenerateResult, Office, Plan } from "./types";

/**
 * Generation runs the clustering and route ordering server-side and can take
 * a few seconds over a full week, so it gets more room than the default.
 */
const GENERATE_TIMEOUT_MS = 60_000;

export interface PlanWeek {
  office?: Office;
  /**
   * Active pairs a generate run would write for. Zero means every plan that
   * week is published, so generating would pay for routing and save nothing.
   */
  pairsToPlan?: number;
  plans: Plan[];
}

export async function fetchPlans(weekStart?: string): Promise<PlanWeek> {
  const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
  const { office, pairsToPlan, plans } = await api<PlanWeek>(`/api/plans${query}`);
  return { office, pairsToPlan, plans };
}

export async function generatePlans(weekStart?: string): Promise<GenerateResult> {
  return api<GenerateResult>("/api/plans", {
    method: "POST",
    body: JSON.stringify(weekStart ? { weekStart } : {}),
    timeoutMs: GENERATE_TIMEOUT_MS,
  });
}

export interface AdjustStopInput {
  planId: string;
  visitId: string;
  leadId?: string;
  dayIndex?: number;
  stopOrder?: number;
  /** Another pair's draft for the same week. */
  targetPlanId?: string;
}

export async function adjustStop({ planId, visitId, ...changes }: AdjustStopInput): Promise<Plan> {
  const { plan } = await api<{ plan: Plan }>(`/api/plans/${planId}/visits/${visitId}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
  return plan;
}

export interface AddStopInput {
  planId: string;
  leadId: string;
  dayIndex: number;
}

export async function addStop({ planId, ...stop }: AddStopInput): Promise<Plan> {
  const { plan } = await api<{ plan: Plan }>(`/api/plans/${planId}/visits`, {
    method: "POST",
    body: JSON.stringify(stop),
  });
  return plan;
}

export async function fetchCandidateLeads(): Promise<CandidateLead[]> {
  const { leads } = await api<{ leads: CandidateLead[] }>("/api/plans/candidate-leads");
  return leads;
}

export async function removeStop(planId: string, visitId: string): Promise<Plan> {
  const { plan } = await api<{ plan: Plan }>(`/api/plans/${planId}/visits/${visitId}`, {
    method: "DELETE",
  });
  return plan;
}

/**
 * Hands the whole week to the reps, every pair at once.
 *
 * A week goes live as a whole rather than a pair at a time: releasing one pair
 * while the others were still drafts left those reps working from a week that
 * was still being edited.
 */
export async function publishWeek(weekStart: string): Promise<Plan[]> {
  const { plans } = await api<{ plans: Plan[] }>("/api/plans/publish", {
    method: "POST",
    body: JSON.stringify({ weekStart }),
  });
  return plans;
}

export interface ClearedWeek {
  plans: number;
  stops: number;
}

export async function clearWeek(weekStart: string): Promise<ClearedWeek> {
  return api<ClearedWeek>("/api/plans/clear", {
    method: "POST",
    body: JSON.stringify({ weekStart }),
  });
}

/** Empties one day of a pair's plan. `dayIndex` 0 is the week's Monday. */
export async function clearDay({
  planId,
  dayIndex,
}: {
  planId: string;
  dayIndex: number;
}): Promise<Plan> {
  const { plan } = await api<{ plan: Plan }>(`/api/plans/${planId}/days/${dayIndex}`, {
    method: "DELETE",
  });
  return plan;
}

/** Trades two days of a pair's plan, each keeping its route. */
export async function swapDays({
  planId,
  from,
  to,
}: {
  planId: string;
  from: number;
  to: number;
}): Promise<Plan> {
  const { plan } = await api<{ plan: Plan }>(`/api/plans/${planId}/days/swap`, {
    method: "POST",
    body: JSON.stringify({ from, to }),
  });
  return plan;
}
