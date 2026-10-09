import { api } from "@/lib/api-client";
import type { AssignableRep, SalesPair } from "./types";

export async function fetchPairs(on?: string, includeInactive = false): Promise<SalesPair[]> {
  const query = new URLSearchParams();
  if (on) query.set("on", on);
  if (includeInactive) query.set("includeInactive", "true");

  const suffix = query.toString();
  const { salesPairs } = await api<{ salesPairs: SalesPair[] }>(
    `/api/sales-pairs${suffix ? `?${suffix}` : ""}`,
  );
  return salesPairs;
}

export async function fetchAssignableReps(): Promise<AssignableRep[]> {
  const { reps } = await api<{ reps: AssignableRep[] }>("/api/sales-pairs/assignable-reps");
  return reps;
}

export async function createPair(input: {
  name?: string;
  userIds: string[];
}): Promise<SalesPair> {
  const { salesPair } = await api<{ salesPair: SalesPair }>("/api/sales-pairs", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return salesPair;
}

export async function addPairMember(pairId: string, userId: string): Promise<SalesPair> {
  const { salesPair } = await api<{ salesPair: SalesPair }>(
    `/api/sales-pairs/${pairId}/members`,
    { method: "POST", body: JSON.stringify({ userId }) },
  );
  return salesPair;
}

export async function removePairMember(pairId: string, userId: string): Promise<SalesPair> {
  const { salesPair } = await api<{ salesPair: SalesPair }>(
    `/api/sales-pairs/${pairId}/members/${userId}`,
    { method: "DELETE" },
  );
  return salesPair;
}

export async function setPairActive(pairId: string, isActive: boolean): Promise<SalesPair> {
  const { salesPair } = await api<{ salesPair: SalesPair }>(
    `/api/sales-pairs/${pairId}/status`,
    { method: "PATCH", body: JSON.stringify({ isActive }) },
  );
  return salesPair;
}
