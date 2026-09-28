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

export function useMyFieldRole() {
  return useQuery({
    queryKey: fieldRoleKeys.mine,
    queryFn: fetchMyFieldRole,
  });
}
