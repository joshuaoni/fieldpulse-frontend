"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as pairsApi from "./api";
import { openMembers, type AssignableRep, type SalesPair } from "./types";

export const pairKeys = {
  all: () => ["sales-pairs"] as const,
  list: (on?: string, includeInactive = false) =>
    ["sales-pairs", "list", on ?? "today", includeInactive] as const,
  assignable: () => ["sales-pairs", "assignable-reps"] as const,
};

export function usePairs(on?: string, includeInactive = false) {
  return useQuery<SalesPair[]>({
    queryKey: pairKeys.list(on, includeInactive),
    queryFn: () => pairsApi.fetchPairs(on, includeInactive),
    staleTime: 60_000,
  });
}

export function useAssignableReps(enabled = true) {
  return useQuery<AssignableRep[]>({
    queryKey: pairKeys.assignable(),
    queryFn: pairsApi.fetchAssignableReps,
    staleTime: 5 * 60_000,
    enabled,
  });
}

export interface SavePairingInput {
  pair?: SalesPair;
  userIds: string[];
}

export function useSavePairing() {
  const queryClient = useQueryClient();

  return useMutation<SalesPair, Error, SavePairingInput>({
    mutationFn: async ({ pair, userIds }) => {
      if (!pair) return pairsApi.createPair({ userIds });

      const before = openMembers(pair).map((member) => member.userId);
      let latest = pair;

      for (const userId of before.filter((id) => !userIds.includes(id))) {
        latest = await pairsApi.removePairMember(pair.id, userId);
      }
      for (const userId of userIds.filter((id) => !before.includes(id))) {
        latest = await pairsApi.addPairMember(pair.id, userId);
      }

      return latest;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pairKeys.all() });
    },
  });
}

export function useSetPairActive() {
  const queryClient = useQueryClient();

  return useMutation<SalesPair, Error, { pairId: string; isActive: boolean }>({
    mutationFn: ({ pairId, isActive }) => pairsApi.setPairActive(pairId, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pairKeys.all() });
    },
  });
}
