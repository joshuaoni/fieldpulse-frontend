"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentPosition, isCancelled, type Fix } from "@/lib/geolocation";
import { secondsSince, useTicker } from "@/lib/use-elapsed";

const NOTICE_AFTER_MS = 1_500;
const HARD_DEADLINE_MS = 120_000;

function hardDeadline(controller: AbortController): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          "Your phone did not report a location. Stand in the open with a clear view of the sky, or switch data on briefly, then try again.",
        ),
      );
    }, HARD_DEADLINE_MS),
  );
}

/**
 * Runs a location search and reports what it is doing.
 *
 * A cold GPS start can take a minute outdoors, and a spinner that says nothing
 * for that long reads as a hang even though it's not.
 */
export function usePositionSearch() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const now = useTicker(startedAt !== null);

  useEffect(() => () => abort.current?.abort(), []);

  const seconds = startedAt === null ? 0 : secondsSince(startedAt, now);

  async function locate(): Promise<Fix> {
    const controller = new AbortController();
    abort.current = controller;

    setStartedAt(Date.now());

    try {
      return await Promise.race([
        getCurrentPosition({ signal: controller.signal }),
        hardDeadline(controller),
      ]);
    } finally {
      setStartedAt(null);
      abort.current = null;
    }
  }

  return {
    locate,
    searching: startedAt !== null && seconds * 1000 >= NOTICE_AFTER_MS,
    seconds,
    cancel: () => abort.current?.abort(),
  };
}

export function PositionSearchNotice({
  seconds,
  onCancel,
}: {
  seconds: number;
  onCancel: () => void;
}) {
  return (
    <div role="status" className="mt-3 rounded-lg border border-border p-3">
      <p className="text-sm">Searching for GPS… {seconds}s</p>
      <p className="mt-1 text-xs text-muted">
        The first fix outdoors can take a minute, especially with mobile data off. Stand where you
        can see the sky.
      </p>
      <Button variant="secondary" onClick={onCancel} className="mt-3 w-full">
        Cancel
      </Button>
    </div>
  );
}

/** Cancelling is a choice, not a failure — it gets no error message. */
export function messageUnlessCancelled(error: unknown): string | null {
  if (isCancelled(error)) return null;
  return error instanceof Error ? error.message : "Something went wrong";
}
