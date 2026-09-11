import { config } from "./config";

const TOKEN_KEY = "fieldpulse.token";

/** One entry per module-role table the ERP resolves for the user. */
export interface ModuleRole {
  module: string;
  role: string;
  workstationIds?: string[];
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STAFF" | "MANAGER" | "ADMIN" | "SUPERADMIN";
  isActive: boolean;
  jobTitle: string | null;
  profileImageUrl: string | null;
  department: { id: string; name: string; code: string } | null;
  moduleRoles?: ModuleRole[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; 
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Non-fatal: the session simply won't survive a reload.
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return body?.message || body?.error || fallback;
  } catch {
    return fallback;
  }
}

export async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${config.erpBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readError(response, "Login failed"));
  }

  const { token } = (await response.json()) as { token?: string };
  if (!token) throw new ApiError(response.status, "Login response contained no token");

  setToken(token);
  return token;
}

/**
 * Session bootstrap. Identity lives with the ERP, which owns the `user` table
 * and resolves every module role in one call.
 */
export async function fetchMe(): Promise<AuthUser> {
  const token = getToken();
  if (!token) throw new ApiError(401, "Not signed in");

  const response = await fetch(`${config.erpBaseUrl}/api/auth/me`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    clearToken();
    throw new ApiError(401, "Session expired — sign in again");
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readError(response, "Could not load your profile"));
  }

  const { user } = (await response.json()) as { user: AuthUser };
  return user;
}

export function logout(): void {
  clearToken();
}
