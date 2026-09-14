"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ApiError, isNetworkError } from "@/lib/errors";
import {
  count as queueCount,
  enqueue,
  flush,
  subscribe as subscribeToQueue,
  type QueuedAction,
} from "@/lib/offline-queue";
import * as visitsApi from "./api";
import type { Visit, VisitFilters, VisitListResponse } from "./types";

export const visitKeys = {
  all: ["visits"] as const,
  mine: (filters: VisitFilters) => ["visits", "mine", filters] as const,
  team: (filters: VisitFilters) => ["visits", "team", filters] as const,
  detail: (id: string) => ["visits", "detail", id] as const,
};

export function useMyVisits(filters: VisitFilters = {}) {
  return useQuery<VisitListResponse>({
    queryKey: visitKeys.mine(filters),
    queryFn: () => visitsApi.fetchMyVisits(filters),
  });
}

export function useTeamVisits(filters: VisitFilters = {}) {
  return useQuery<VisitListResponse>({
    queryKey: visitKeys.team(filters),
    queryFn: () => visitsApi.fetchTeamVisits(filters),
  });
}

export function useVisit(id: string) {
  return useQuery<Visit>({
    queryKey: visitKeys.detail(id),
    queryFn: () => visitsApi.fetchVisit(id),
  });
}

/**
 * A failure that means "the network never carried this" — as opposed to the
 * server considering and refusing it. Only the former is worth queuing.
 */
function shouldQueue(error: unknown): boolean {
  if (isNetworkError(error)) return true;
  // 5xx means the request arrived but the server could not complete it; a
  // retry later is reasonable.
  return error instanceof ApiError && error.status >= 500;
}

/** Sends one queued action, deciding whether it may leave the queue. */
async function sendQueued(action: QueuedAction): Promise<"done" | "retry"> {
  try {
    if (action.kind === "check-in") {
      await visitsApi.checkIn({
        visitId: action.visitId,
        lat: action.lat,
        lng: action.lng,
        photo: action.photo,
        clientLocalCheckInAt: action.clientLocalAt,
      });
    } else if (action.kind === "check-out") {
      await visitsApi.checkOut({
        visitId: action.visitId,
        lat: action.lat,
        lng: action.lng,
        clientLocalCheckOutAt: action.clientLocalAt,
      });
    } else {
      await visitsApi.submitReport({
        visitId: action.visitId,
        notes: action.notes,
        outcome: action.outcome,
      });
    }
    return "done";
  } catch (error) {
    if (shouldQueue(error)) return "retry";
    // The server considered it and said no — most often because a previous
    // replay already landed it. Keeping it would jam the queue forever.
    return "done";
  }
}

/**
 * Queue depth, as a live value. Reps are told how many actions are waiting.
 */
export function usePendingActions(): number {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void queueCount().then((next) => {
        if (active) setPending(next);
      });
    };

    refresh();
    const unsubscribe = subscribeToQueue(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return pending;
}

/** Replays the queue whenever the browser reports a connection again. */
export function useQueueFlush() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const run = () => {
      void flush(sendQueued).then(({ sent }) => {
        if (sent > 0) void queryClient.invalidateQueries({ queryKey: visitKeys.all });
      });
    };

    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [queryClient]);
}

interface CheckInVariables {
  visitId: string;
  lat: number;
  lng: number;
  photo: Blob;
}

/**
 * Records a check-in, falling back to the durable queue when the request never
 * reaches the server.
 */
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation<{ queued: boolean; visit?: Visit }, Error, CheckInVariables>({
    mutationFn: async ({ visitId, lat, lng, photo }) => {
      const clientLocalAt = new Date().toISOString();
      try {
        const visit = await visitsApi.checkIn({
          visitId,
          lat,
          lng,
          photo,
          clientLocalCheckInAt: clientLocalAt,
        });
        return { queued: false, visit };
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        await enqueue({ kind: "check-in", visitId, lat, lng, photo, clientLocalAt });
        return { queued: true };
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: visitKeys.all }),
  });
}

interface CheckOutVariables {
  visitId: string;
  lat: number;
  lng: number;
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation<{ queued: boolean; visit?: Visit }, Error, CheckOutVariables>({
    mutationFn: async ({ visitId, lat, lng }) => {
      const clientLocalAt = new Date().toISOString();
      try {
        const visit = await visitsApi.checkOut({
          visitId,
          lat,
          lng,
          clientLocalCheckOutAt: clientLocalAt,
        });
        return { queued: false, visit };
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        await enqueue({ kind: "check-out", visitId, lat, lng, clientLocalAt });
        return { queued: true };
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: visitKeys.all }),
  });
}

interface ReportVariables {
  visitId: string;
  notes: string;
  outcome?: string;
}

export function useSubmitReport() {
  const queryClient = useQueryClient();

  return useMutation<{ queued: boolean; visit?: Visit }, Error, ReportVariables>({
    mutationFn: async ({ visitId, notes, outcome }) => {
      try {
        const visit = await visitsApi.submitReport({ visitId, notes, outcome });
        return { queued: false, visit };
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        await enqueue({
          kind: "report",
          visitId,
          notes,
          outcome,
          clientLocalAt: new Date().toISOString(),
        });
        return { queued: true };
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: visitKeys.all }),
  });
}
