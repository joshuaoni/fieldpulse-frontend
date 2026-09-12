"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMyFieldRole } from "./api";

export const fieldRoleKeys = {
  mine: ["field-roles", "me"] as const,
};

export function useMyFieldRole() {
  return useQuery({
    queryKey: fieldRoleKeys.mine,
    queryFn: fetchMyFieldRole,
  });
}
