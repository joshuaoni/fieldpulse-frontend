import { ApiError, clearToken, getToken } from "./auth";
import { config } from "./config";

/**
 * Calls the FieldPulse API with the ERP-issued bearer token. S
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers });

  if (response.status === 401) {
    clearToken();
    throw new ApiError(401, "Session expired — sign in again");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body?.error || body?.message || message;
    } catch {
      // keep the status-code message
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
