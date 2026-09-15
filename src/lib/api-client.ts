import { config } from "./config";
import { ApiError, RequestTimeout } from "./errors";
import { clearToken, getToken } from "./token";

/**
 * How long any one request may take before it is treated as never having
 * arrived.
 *
 * Generous, because it has to cover a check-in photo going up a bad connection
 * at a shop front. A check-in that trips it is not lost — it goes into the
 * durable queue and replays later, which is a far better outcome for the rep
 * than standing at the door watching a spinner.
 */
const REQUEST_TIMEOUT_MS = 45_000;

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
  init: RequestInit & { auth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const { auth = true, timeoutMs = REQUEST_TIMEOUT_MS, ...rest } = init;
  const baseUrl = target === "erp" ? config.erpBaseUrl : config.apiBaseUrl;

  const headers = new Headers(rest.headers);
  headers.set("Accept", "application/json");

  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;
  if (rest.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const deadline = new AbortController();
  let expiry: ReturnType<typeof setTimeout> | undefined;

  const timedOut = new Promise<never>((_, reject) => {
    expiry = setTimeout(() => {
      deadline.abort();
      reject(new RequestTimeout());
    }, timeoutMs);
  });

  let response: Response;
  try {
    response = await Promise.race([
      fetch(`${baseUrl}${path}`, { ...rest, headers, signal: deadline.signal }),
      timedOut,
    ]);
  } catch (error) {
    if (error instanceof RequestTimeout) throw error;
    if (deadline.signal.aborted) throw new RequestTimeout();
    throw error;
  } finally {
    // Also stops the losing timer from rejecting with nobody listening.
    clearTimeout(expiry);
  }

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

type CallOptions = RequestInit & { auth?: boolean; timeoutMs?: number };

/** Calls the FieldPulse API (meta4-fieldpulse). */
export const api = <T>(path: string, init?: CallOptions) => request<T>("fieldpulse", path, init);

/** Calls the ERP (meta-erp-backend) — sign-in and identity only. */
export const erp = <T>(path: string, init?: CallOptions) => request<T>("erp", path, init);
