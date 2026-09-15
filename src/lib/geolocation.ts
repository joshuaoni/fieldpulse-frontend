/**
 * A single position fix, read only during an active check-in or check-out.
 */

export interface Fix {
  lat: number;
  lng: number;
}

export interface PositionRequest {
  /** How long to keep searching before giving up. */
  budgetMs?: number;
  /** Abort the search — the rep pressing Cancel. */
  signal?: AbortSignal;
}

/**
 * How old a stored fix may be and still stand in for a fresh one.
 *
 * Not zero: refusing a cached position makes the phone acquire one from
 * scratch, and with mobile data off that is when it least can. Not generous
 * either — this decides how far a rep could have moved between the fix and the
 * check-in. Thirty seconds is about forty metres on foot.
 */
const CACHED_FIX_MS = 30_000;
const CACHED_FIX_TIMEOUT_MS = 3_000;

/**
 * A cold GPS start with no network assistance means decoding the ephemeris
 * from the satellite signal itself. Outdoors that runs
 * to a minute or more.
 */
const DEFAULT_BUDGET_MS = 90_000;

class PositionError extends Error {
  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message);
  }
}

/** The rep pressed Cancel. Not a failure, and not worth an error message. */
export class PositionCancelled extends Error {
  constructor() {
    super("Location search cancelled");
    this.name = "PositionCancelled";
  }
}

export const isCancelled = (error: unknown): boolean => error instanceof PositionCancelled;

const toFix = (position: GeolocationPosition): Fix => ({
  lat: position.coords.latitude,
  lng: position.coords.longitude,
});

/**
 * Asks the phone for a fix it already holds, and gives up quickly when there
 * is none.
 */
function cachedFix(): Promise<Fix | null> {
  return new Promise((resolve, reject) => {
    let done = false;

    const giveUp = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(null);
    }, CACHED_FIX_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (done) return;
        done = true;
        clearTimeout(giveUp);
        resolve(toFix(position));
      },
      (error) => {
        if (done) return;
        done = true;
        clearTimeout(giveUp);
        if (error.code === 1) reject(new PositionError(error.message, error.code));
        else resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: CACHED_FIX_TIMEOUT_MS,
        maximumAge: CACHED_FIX_MS,
      },
    );
  });
}

/**
 * Watches until a fix arrives, the budget runs out, or the rep cancels.
 *
 * A watch rather than a one-shot request: a one-shot gives the receiver a
 * single deadline and reports failure if it is missed, while a watch hands
 * over the first fix the moment it lands, which is what a cold start needs.
 */
function watchForFix(budgetMs: number, signal?: AbortSignal): Promise<Fix> {
  return new Promise((resolve, reject) => {
    let done = false;
    let watchId: number | null = null;

    const finish = () => {
      done = true;
      clearTimeout(timer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      if (done) return;
      finish();
      reject(new PositionCancelled());
    };

    const timer = setTimeout(() => {
      if (done) return;
      finish();
      reject(
        new Error(
          "Your phone could not find your location. Stand in the open with a clear view of the sky, or switch data on briefly, then try again.",
        ),
      );
    }, budgetMs);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (done) return;
        finish();
        resolve(toFix(position));
      },
      (error) => {
        // Only a refusal is final. Anything else means "not yet".
        if (done || error.code !== 1) return;
        finish();
        void describeDenial().then((reason) => reject(new Error(reason)));
      },
      { enableHighAccuracy: true, maximumAge: 0 },
    );

    if (signal?.aborted) onAbort();
    else signal?.addEventListener("abort", onAbort);
  });
}

/** Whether the browser will answer without putting a dialog in front of the rep. */
async function permissionAlreadyGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" });
    return status?.state === "granted";
  } catch {
    return false;
  }
}

/**
 * The position to record against a check-in or check-out.
 *
 * Take a fix the phone already has if there is one, otherwise search properly.
 */
export async function getCurrentPosition({
  budgetMs = DEFAULT_BUDGET_MS,
  signal,
}: PositionRequest = {}): Promise<Fix> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("This device cannot report its location");
  }

  if (signal?.aborted) throw new PositionCancelled();

  if (!(await permissionAlreadyGranted())) return watchForFix(budgetMs, signal);

  let cached: Fix | null = null;
  try {
    cached = await cachedFix();
  } catch (error) {
    if (error instanceof PositionError && error.code === 1) {
      throw new Error(await describeDenial());
    }
  }

  if (cached) return cached;
  if (signal?.aborted) throw new PositionCancelled();

  return watchForFix(budgetMs, signal);
}

async function describeDenial(): Promise<string> {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" });

    if (status?.state === "prompt") {
      return "Your phone has location switched off for this browser. Turn it on in the phone's settings, then try again.";
    }
  } catch {
    // No Permissions API; fall through to wording that covers both cases.
  }

  return "Location permission is required to check in. Allow location for this site in your browser settings, then try again.";
}
