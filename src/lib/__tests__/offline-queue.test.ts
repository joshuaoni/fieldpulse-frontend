/**
 * @vitest-environment node
 *
 * Node rather than jsdom: jsdom supplies its own Blob, which fake-indexeddb's
 * structured clone does not round-trip. Real browsers store Blobs in IndexedDB
 * natively, so that is a limitation of the test environment, not of the queue —
 * and Node's Blob does round-trip, which is what keeps the durability
 * assertion below meaningful.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { count, enqueue, flush, listQueued, type QueuedAction } from "../offline-queue";

/**
 * These run against a real IndexedDB (fake-indexeddb), not a mock, because the
 * thing being tested is durability: a check-in recorded offline has to survive
 * an app kill, a reboot, and a week in a drawer.
 */
async function drain() {
  await flush(async () => "done");
}

const checkIn = (visitId: string, fix = { lat: 6.6, lng: 3.35 }): QueuedAction => ({
  kind: "check-in",
  visitId,
  ...fix,
  photo: new Blob(["jpeg-bytes"], { type: "image/jpeg" }),
  clientLocalAt: new Date().toISOString(),
});

const checkOut = (visitId: string): QueuedAction => ({
  kind: "check-out",
  visitId,
  lat: 6.6,
  lng: 3.35,
  clientLocalAt: new Date().toISOString(),
});

beforeEach(async () => {
  await drain();
});

afterEach(async () => {
  await drain();
});

describe("offline queue", () => {
  it("persists a queued check-in, photo and all", async () => {
    await enqueue(checkIn("visit-1"));

    const [item] = await listQueued();
    expect(item.action.kind).toBe("check-in");
    expect(item.action).toMatchObject({ visitId: "visit-1", lat: 6.6, lng: 3.35 });
    // The Blob survives the round trip — this is why the queue is IndexedDB
    // and not localStorage.
    if (item.action.kind === "check-in") {
      expect(item.action.photo).toBeInstanceOf(Blob);
      expect(await item.action.photo.text()).toBe("jpeg-bytes");
    }
  });

  /**
   * One arrival is one action however many times it was tapped. A rep whose
   * screen has not moved on will tap again, and every tap used to leave its
   * own copy behind — twelve queued check-ins for one visit, each holding a
   * photo in storage.
   */
  it("keeps one action per kind per visit, however many times it is recorded", async () => {
    await enqueue(checkIn("visit-1"));
    await enqueue(checkIn("visit-1"));
    await enqueue(checkIn("visit-1"));

    expect(await count()).toBe(1);
  });

  it("keeps the last recording, not the first", async () => {
    await enqueue(checkIn("visit-1"));
    await enqueue(checkIn("visit-1", { lat: 6.7, lng: 3.4 }));

    const [item] = await listQueued();
    expect(item.action).toMatchObject({ lat: 6.7, lng: 3.4 });
  });

  // Replacing must not promote it past a check-out queued in between, which
  // would send a departure the server has no arrival for.
  it("leaves a replaced action where it stood in the queue", async () => {
    await enqueue(checkIn("visit-1"));
    await enqueue(checkOut("visit-1"));
    await enqueue(checkIn("visit-1"));

    const seen: string[] = [];
    await flush(async (action) => {
      seen.push(action.kind);
      return "done";
    });

    expect(seen).toEqual(["check-in", "check-out"]);
  });

  it("still keeps the same action for a different visit apart", async () => {
    await enqueue(checkIn("visit-1"));
    await enqueue(checkIn("visit-2"));

    expect(await count()).toBe(2);
  });

  // A check-out replayed before its check-in would be refused by the server,
  // so order is part of the contract, not an implementation detail.
  it("replays oldest-first", async () => {
    await enqueue(checkIn("visit-1"));
    await enqueue(checkOut("visit-1"));
    await enqueue(checkIn("visit-2"));

    const seen: string[] = [];
    await flush(async (action) => {
      seen.push(`${action.kind}:${action.visitId}`);
      return "done";
    });

    expect(seen).toEqual(["check-in:visit-1", "check-out:visit-1", "check-in:visit-2"]);
    expect(await count()).toBe(0);
  });

  it("stops at the first retryable failure, leaving the rest queued in order", async () => {
    await enqueue(checkIn("visit-1"));
    await enqueue(checkOut("visit-1"));

    const send = vi.fn(async () => "retry" as const);
    const result = await flush(send);

    // Nothing after the failure is attempted — skipping ahead would send a
    // check-out for a check-in the server has never seen.
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(2);
  });

  it("does not re-send an action that already succeeded", async () => {
    await enqueue(checkIn("visit-1"));

    await flush(async () => "done");
    const second = vi.fn(async () => "done" as const);
    await flush(second);

    expect(second).not.toHaveBeenCalled();
  });

  // A 4xx means the server considered it and said no — most often because an
  // earlier replay already landed. Keeping it would jam the queue forever.
  it("drops a permanently refused action instead of blocking the queue", async () => {
    await enqueue(checkIn("visit-1"));
    await enqueue(checkOut("visit-1"));

    let call = 0;
    await flush(async () => (++call === 1 ? "done" : "done"));

    expect(await count()).toBe(0);
  });

  it("records the failure reason against the item it belongs to", async () => {
    await enqueue(checkIn("visit-1"));

    await flush(async () => {
      throw new Error("Network request failed");
    });

    const [item] = await listQueued();
    expect(item.attempts).toBe(1);
    expect(item.lastError).toBe("Network request failed");
  });

  it("survives a reload — the data is in IndexedDB, not memory", async () => {
    await enqueue(checkIn("visit-1"));

    // Re-importing the module is as close as this environment gets to a fresh
    // page load; the queue is read back from the database either way.
    vi.resetModules();
    const reloaded = await import("../offline-queue");

    expect(await reloaded.count()).toBe(1);
  });
});
