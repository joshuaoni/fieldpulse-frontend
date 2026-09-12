import { erp } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { clearToken, getToken, setToken } from "@/lib/token";
import type { AuthUser } from "./types";

/**
 * Authenticates against the ERP and keeps the token it issues. FieldPulse
 * verifies that same token with the shared JWT_SECRET, so one sign-in covers
 * both services.
 */
export async function login(email: string, password: string): Promise<string> {
  const { token } = await erp<{ token?: string }>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });

  if (!token) throw new ApiError(500, "Login response contained no token");

  setToken(token);
  return token;
}

export async function fetchMe(): Promise<AuthUser> {
  if (!getToken()) throw new ApiError(401, "Not signed in");
  const { user } = await erp<{ user: AuthUser }>("/api/auth/me");
  return user;
}

export function logout(): void {
  clearToken();
}
