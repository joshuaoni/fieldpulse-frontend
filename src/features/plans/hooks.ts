"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as plansApi from "./api";
import type { PlanWeek } from "./api";
import type { Plan } from "./types";

export const planKeys = {
  all: ["plans"] as const,
  week: (weekStart?: string) => ["plans", "week", weekStart ?? "current"] as const,
};

export function usePlans(weekStart?: string) {
  return useQuery<PlanWeek>({
    queryKey: planKeys.week(weekStart),
    queryFn: () => plansApi.fetchPlans(weekStart),
  });
}

/**
 * Every mutation refetches the whole week rather than patching one plan into
 * the cache.
 *
 * A stop moved between pairs leaves one plan and joins another, and the
 * response only carries the plan that was addressed — so the other one is
 * stale the moment it lands. Refetching is a few hundred milliseconds and is
 * always right; reconciling by hand would be neither.
 */
function useWeekMutation<TInput>(run: (input: TInput) => Promise<Plan>, weekStart?: string) {
  const queryClient = useQueryClient();

  return useMutation<Plan, Error, TInput>({
    mutationFn: run,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKeys.week(weekStart) });
    },
  });
}

export const useAdjustStop = (weekStart?: string) =>
  useWeekMutation(plansApi.adjustStop, weekStart);

export const useRemoveStop = (weekStart?: string) =>
  useWeekMutation(
    ({ planId, visitId }: { planId: string; visitId: string }) =>
      plansApi.removeStop(planId, visitId),
    weekStart,
  );

export function usePublishWeek(weekStart: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => plansApi.publishWeek(weekStart),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKeys.week(weekStart) });
    },
  });
}

export function useGeneratePlans(weekStart?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => plansApi.generatePlans(weekStart),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKeys.week(weekStart) });
    },
  });
}
