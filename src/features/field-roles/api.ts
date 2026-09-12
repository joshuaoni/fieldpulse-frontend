import { api } from "@/lib/api-client";
import type { MyFieldRoleResponse } from "./types";

export async function fetchMyFieldRole(): Promise<MyFieldRoleResponse> {
  return api<MyFieldRoleResponse>("/api/field-roles/me");
}
