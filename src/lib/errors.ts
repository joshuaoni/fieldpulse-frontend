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

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  return error instanceof RequestTimeout;
}

/** A request that passed its deadline before the server answered. */
export class RequestTimeout extends Error {
  constructor() {
    super("The network did not respond");
    this.name = "RequestTimeout";
  }
}
