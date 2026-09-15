/**
 * @vitest-environment node
 *
 * The queue's behaviour when the storage layer stops answering.
 *
 * IndexedDB is specified to answer every request with an event. iOS Safari
 * does not always do so — `indexedDB.open` can return a request that fires
 * neither success nor error, most often in a standalone web app or a page
 * restored from the back-forward cache. Awaiting that is indefinite, and on
 * screen it looked like a check-in counting up forever while the phone
 * silently wrote nothing down. These assert the wait is bounded, so a storage
 * fault surfaces as an error a rep can act on instead of a frozen screen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const checkIn = {
  kind: "check-in" as const,
  visitId: "visit-1",
  lat: 6.6,
  lng: 3.35,
  photo: new Blob(["jpeg-bytes"], { type: "image/jpeg" }),
  clientLocalAt: new Date().toISOString(),
};

/** An `open` that returns a request and then never speaks again. */
function silentIndexedDb() {
  return {
    open: () => ({ onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null }),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a storage layer that never answers", () => {
  it("gives up rather than waiting forever", async () => {
    vi.stubGlobal("indexedDB", silentIndexedDb());
    const { enqueue } = await import("../offline-queue");

    const pending = enqueue(checkIn);
    const settled = pending.then(
      () => "resolved",
      (error: Error) => error.name,
    );

    // Two attempts, each with its own deadline, then it reports the fault.
    await vi.advanceTimersByTimeAsync(11_000);

    await expect(settled).resolves.toBe("StorageUnavailable");
  });

  /**
   * The retry is the established way round the WebKit fault: a second `open`
   * after the first has gone quiet usually succeeds.
   */
  it("tries a second time before declaring the storage unusable", async () => {
    const open = vi.fn(() => ({
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      onblocked: null,
    }));
    vi.stubGlobal("indexedDB", { open });
    const { enqueue } = await import("../offline-queue");

    const settled = enqueue(checkIn).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(11_000);
    await settled;

    expect(open).toHaveBeenCalledTimes(2);
  });
});
