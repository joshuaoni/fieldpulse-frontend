import { config } from "./config";
import { ApiError } from "./errors";
import { clearToken, getToken } from "./token";

type Target = "fieldpulse" | "erp";

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return {
      message: body?.error || body?.message || fallback,
      code: typeof body?.code === "string" ? body.code : undefined,
    };
  } catch {
    return { message: fallback, code: undefined };
  }
}

/**
 * The single way any code in this app reaches a server. Components and hooks
 * never call `fetch` directly — that is what keeps auth, error shape and the
 * 401 rule in one place.
 *
 * `target` picks the service: the ERP owns sign-in and identity, FieldPulse
 * owns everything else. Both accept the same bearer token.
 */
export async function request<T>(
  target: Target,
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, ...rest } = init;
  const baseUrl = target === "erp" ? config.erpBaseUrl : config.apiBaseUrl;

  const headers = new Headers(rest.headers);
  headers.set("Accept", "application/json");
  if (rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, { ...rest, headers });

  if (response.status === 401) {
    clearToken();
    throw new ApiError(401, "Session expired — sign in again");
  }

  if (!response.ok) {
    const { message, code } = await readErrorMessage(
      response,
      `Request failed (${response.status})`,
    );
    throw new ApiError(response.status, message, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Calls the FieldPulse API (meta4-fieldpulse). */
export const api = <T>(path: string, init?: RequestInit & { auth?: boolean }) =>
  request<T>("fieldpulse", path, init);

/** Calls the ERP (meta-erp-backend) — sign-in and identity only. */
export const erp = <T>(path: string, init?: RequestInit & { auth?: boolean }) =>
  request<T>("erp", path, init);
