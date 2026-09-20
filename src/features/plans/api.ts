import { api } from "@/lib/api-client";
import type { GenerateResult, Office, Plan } from "./types";

/**
 * Generation runs the clustering and route ordering server-side and can take
 * a few seconds over a full week, so it gets more room than the default.
 */
const GENERATE_TIMEOUT_MS = 60_000;

export interface PlanWeek {
  /**
   * Where every route starts and ends. Absent on an older backend, which is
   * why the route view treats it as optional rather than assuming (0, 0) —
   * a route drawn from the Gulf of Guinea would be worse than no route.
   */
  office?: Office;
  plans: Plan[];
}

export async function fetchPlans(weekStart?: string): Promise<PlanWeek> {
  const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
  const { office, plans } = await api<{ office?: Office; plans: Plan[] }>(`/api/plans${query}`);
  return { office, plans };
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
