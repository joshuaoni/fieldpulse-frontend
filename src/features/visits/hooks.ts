"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { VisitOutcome } from "@/lib/outcomes";
import { useEffect, useState } from "react";
import { ApiError, isNetworkError } from "@/lib/errors";
import {
  count as queueCount,
  enqueue,
  flush,
  listQueued,
  subscribe as subscribeToQueue,
  type QueuedAction,
} from "@/lib/offline-queue";
import * as visitsApi from "./api";
import type {
  Visit,
  VisitAttendance,
  VisitFilters,
  VisitListResponse,
  VisitStatus,
} from "./types";

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
 * Whether there is any point attempting a request at all.
 *
 * `navigator.onLine` is only trustworthy in one direction — true does not
 * promise the server is reachable — but false is definitive, and that is the
 * direction worth acting on. Queueing straight away turns a rep's check-in
 * into "Saved on this device" the instant they tap, rather than after a
 * deadline spent waiting for a request that was never going to leave the
 * phone.
 */
const definitelyOffline = (): boolean =>
  typeof navigator !== "undefined" && navigator.onLine === false;

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
        accuracyM: action.accuracyM,
        photo: action.photo,
        clientLocalCheckInAt: action.clientLocalAt,
      });
    } else if (action.kind === "check-out") {
      await visitsApi.checkOut({
        visitId: action.visitId,
        lat: action.lat,
        lng: action.lng,
        accuracyM: action.accuracyM,
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

function withLocalChange(visit: Visit, repId: string, change: Partial<VisitAttendance>): Visit {
  const held = visit.attendances.some((attendance) => attendance.repId === repId);

  const attendances = held
    ? visit.attendances.map((attendance) =>
        attendance.repId === repId ? { ...attendance, ...change } : attendance,
      )
    : [...visit.attendances, { ...blankAttendance(visit.id, repId), ...change }];

  return { ...visit, attendances, status: rollUp(attendances, visit.status) };
}

const blankAttendance = (visitId: string, repId: string): VisitAttendance => ({
  id: `local:${visitId}:${repId}`,
  repId,
  checkInLat: null,
  checkInLng: null,
  checkInPhotoUrl: null,
  checkInAt: null,
  checkOutLat: null,
  checkOutLng: null,
  checkOutAt: null,
  clientLocalCheckInAt: null,
  clientLocalCheckOutAt: null,
});

function rollUp(attendances: VisitAttendance[], current: VisitStatus): VisitStatus {
  const arrived = attendances.filter((attendance) => attendance.checkInAt);
  if (arrived.length === 0) return current;

  return arrived.every((attendance) => attendance.checkOutAt) ? "COMPLETED" : "CHECKED_IN";
}

function patchCaches(client: QueryClient, visitId: string, apply: (visit: Visit) => Visit): void {
  client.setQueryData<Visit>(visitKeys.detail(visitId), (held) => (held ? apply(held) : held));

  client.setQueriesData<VisitListResponse>({ queryKey: visitKeys.all }, (held) => {
    if (!held?.visits?.some((visit) => visit.id === visitId)) return held;

    return {
      ...held,
      visits: held.visits.map((visit) => (visit.id === visitId ? apply(visit) : visit)),
    };
  });
}

export function useQueuedFor(visitId: string): Set<QueuedAction["kind"]> {
  const [kinds, setKinds] = useState<Set<QueuedAction["kind"]>>(() => new Set());

  useEffect(() => {
    let active = true;

    const refresh = () => {
      void listQueued()
        .then((items) => {
          if (!active) return;
          setKinds(
            new Set(
              items
                .filter((item) => item.action.visitId === visitId)
                .map((item) => item.action.kind),
            ),
          );
        })
        .catch(() => {});
    };

    refresh();
    const unsubscribe = subscribeToQueue(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [visitId]);

  return kinds;
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
  accuracyM?: number | null;
  visitId: string;
  repId: string;
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
    mutationFn: async ({ visitId, repId, lat, lng, accuracyM, photo }) => {
      const clientLocalAt = new Date().toISOString();

      const queue = async () => {
        await enqueue({ kind: "check-in", visitId, lat, lng, accuracyM, photo, clientLocalAt });
        patchCaches(queryClient, visitId, (visit) =>
          withLocalChange(visit, repId, {
            checkInAt: clientLocalAt,
            clientLocalCheckInAt: clientLocalAt,
            checkInLat: lat,
            checkInLng: lng,
          }),
        );
        return { queued: true };
      };

      if (definitelyOffline()) return queue();

      try {
        const visit = await visitsApi.checkIn({
          visitId,
          lat,
          lng,
          accuracyM,
          photo,
          clientLocalCheckInAt: clientLocalAt,
        });
        return { queued: false, visit };
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        return queue();
      }
    },
    // Nothing queued has reached the server, and a refetch that failed — or
    // worse, succeeded before the queue drained — would undo what was just
    // written above.
    onSuccess: (result) => {
      if (!result.queued) void queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}

interface CheckOutVariables {
  accuracyM?: number | null;
  visitId: string;
  repId: string;
  lat: number;
  lng: number;
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation<{ queued: boolean; visit?: Visit }, Error, CheckOutVariables>({
    mutationFn: async ({ visitId, repId, lat, lng, accuracyM }) => {
      const clientLocalAt = new Date().toISOString();

      const queue = async () => {
        await enqueue({ kind: "check-out", visitId, lat, lng, accuracyM, clientLocalAt });
        patchCaches(queryClient, visitId, (visit) =>
          withLocalChange(visit, repId, {
            checkOutAt: clientLocalAt,
            clientLocalCheckOutAt: clientLocalAt,
            checkOutLat: lat,
            checkOutLng: lng,
          }),
        );
        return { queued: true };
      };

      if (definitelyOffline()) return queue();

      try {
        const visit = await visitsApi.checkOut({
          visitId,
          lat,
          lng,
          accuracyM,
          clientLocalCheckOutAt: clientLocalAt,
        });
        return { queued: false, visit };
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        return queue();
      }
    },
    onSuccess: (result) => {
      if (!result.queued) void queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}

interface ReportVariables {
  visitId: string;
  notes: string;
  outcome?: VisitOutcome;
}

export function useSubmitReport() {
  const queryClient = useQueryClient();

  return useMutation<{ queued: boolean; visit?: Visit }, Error, ReportVariables>({
    mutationFn: async ({ visitId, notes, outcome }) => {
      if (definitelyOffline()) {
        await enqueue({
          kind: "report",
          visitId,
          notes,
          outcome,
          clientLocalAt: new Date().toISOString(),
        });
        return { queued: true };
      }

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
    onSuccess: (result) => {
      if (!result.queued) void queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}
