/** Any non-2xx response from the ERP or the FieldPulse API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** True when the request never reached the server — offline, DNS, CORS. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}
