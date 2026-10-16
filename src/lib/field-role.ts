"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api-client";

/**
 * Which FieldPulse role the signed-in user holds.
 */

/** The FieldPulse module role, or null when the user holds none. */
export type FieldRole = "FIELD_MANAGER" | "FIELD_REP";

export interface MyFieldRoleResponse {
  fieldRole: FieldRole | null;
}

export const fieldRoleKeys = {
  mine: ["field-roles", "me"] as const,
};

export async function fetchMyFieldRole(): Promise<MyFieldRoleResponse> {
  return api<MyFieldRoleResponse>("/api/field-roles/me");
}

export const NO_FIELD_ACCESS_MESSAGE =
  "This account does not have access to FieldPulse. Ask a field manager to give you a FieldPulse role.";

export async function hasFieldAccess(): Promise<boolean> {
  try {
    return (await fetchMyFieldRole()).fieldRole !== null;
  } catch {
    return true;
  }
}

export function useMyFieldRole() {
  return useQuery({
    queryKey: fieldRoleKeys.mine,
    queryFn: fetchMyFieldRole,
  });
}
