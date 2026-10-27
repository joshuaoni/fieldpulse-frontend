import { describe, expect, it } from "vitest";
import type { CheckIn } from "@/features/check-ins/types";
import type { Visit } from "@/features/visits/types";
import { hasStarted, needsAttention, workedPairs } from "./attention";
import type { SalesPair } from "@/features/pairs/types";

const flaggedCheckIn = (overrides: Partial<CheckIn> = {}): CheckIn =>
  ({
    attendanceId: "att-1",
    visitId: "visit-1",
    status: "FLAGGED",
    concerns: ["FAR_FROM_ADDRESS"],
    pairId: "pair-1",
    lead: { id: "lead-1", companyName: "Tech Haven", address: null },
    rep: { id: "rep-1", firstName: "Chinedu", lastName: "Obi" },
    checkInAt: "2026-09-26T09:30:00.000Z",
    verifiedAt: "2026-09-26T09:30:00.000Z",
    distanceM: 1400,
    departureDistanceM: null,
    accuracyM: 12,
    departureAccuracyM: null,
    photoUrl: null,
    dayProgress: { done: 1, total: 5 },
    report: null,
    ...overrides,
  }) as CheckIn;

const visit = (overrides: Partial<Visit> = {}): Visit =>
  ({
    id: "visit-9",
    leadId: "lead-9",
    lead: { id: "lead-9", companyName: "Bright Field Ltd", address: null },
    pairId: "pair-1",
    pair: { id: "pair-1", name: "Tunde & Zainab", members: [] },
    status: "MISSED",
    scheduledFor: "2026-09-24T00:00:00.000Z",
    attendances: [],
    updatedAt: "2026-09-25T00:00:00.000Z",
    ...overrides,
  }) as Visit;

/**
 * Both kinds are the field's own verdict rather than a guess from the clock:
 * the evidence rules flagged one, and the day closed on the other with nobody
 * having arrived.
 */
describe("what needs a manager's attention", () => {
  it("names the rep and what was wrong with a flagged check-in", () => {
    const [item] = needsAttention({ flagged: [flaggedCheckIn()], visits: [] });

    expect(item.kind).toBe("FLAGGED");
    expect(item.title).toBe("Tech Haven");
    expect(item.detail).toContain("Chinedu");
    expect(item.detail).toContain("1.4 km");
    expect(item.visitId).toBe("visit-1");
  });

  it("carries a flagged departure too, since the rules cover both ends", () => {
    const leftElsewhere = flaggedCheckIn({
      concerns: ["LEFT_FROM_ELSEWHERE"],
      departureDistanceM: 2000,
    });

    expect(needsAttention({ flagged: [leftElsewhere], visits: [] })[0].detail).toContain(
      "left from 2.0 km away",
    );
  });

  it("names the pair on a missed visit", () => {
    const [item] = needsAttention({ flagged: [], visits: [visit()] });

    expect(item.kind).toBe("MISSED");
    expect(item.detail).toBe("Tunde & Zainab — nobody checked in");
  });

  it("leaves out a visit that was not missed", () => {
    expect(needsAttention({ flagged: [], visits: [visit({ status: "COMPLETED" })] })).toEqual([]);
  });

  it("puts the most recent first, whichever kind it is", () => {
    const items = needsAttention({ flagged: [flaggedCheckIn()], visits: [visit()] });

    expect(items.map((item) => item.kind)).toEqual(["FLAGGED", "MISSED"]);
  });

  it("has nothing to say on a clean week", () => {
    expect(needsAttention({ flagged: [], visits: [] })).toEqual([]);
  });
});

const pair = (done: number, total: number, current = false): SalesPair =>
  ({
    id: `pair-${done}-${total}-${current}`,
    isActive: true,
    members: [],
    day: {
      current: current ? { visitId: "v1", leadId: "l1", companyName: "Tech Haven" } : null,
      progress: { done, total },
      week: { done, total },
    },
  }) as unknown as SalesPair;

describe("who is out", () => {
  it("counts a pair standing in a shop", () => {
    expect(hasStarted(pair(0, 4, true))).toBe(true);
  });

  it("counts a pair that has finished a call and moved on", () => {
    expect(hasStarted(pair(2, 4))).toBe(true);
  });

  it("does not count a pair that has not left yet", () => {
    expect(hasStarted(pair(0, 4))).toBe(false);
  });
});

describe("workedPairs", () => {
  const pair = (id: string) => ({ id, isActive: true }) as SalesPair;
  const checkIn = (pairId: string, visitId: string, at: string, companyName = visitId) =>
    ({ pairId, visitId, checkInAt: at, lead: { companyName } }) as CheckIn;

  it("counts each visit once, even when both members checked in", () => {
    const [worked] = workedPairs(
      [pair("a")],
      [checkIn("a", "v1", "2026-10-20T09:00:00Z"), checkIn("a", "v1", "2026-10-20T09:02:00Z")],
    );

    expect(worked.visits).toBe(1);
  });

  it("names the latest stop and leaves out pairs that never checked in", () => {
    const worked = workedPairs(
      [pair("a"), pair("b")],
      [
        checkIn("a", "v2", "2026-10-21T11:00:00Z", "Later Ltd"),
        checkIn("a", "v1", "2026-10-20T09:00:00Z", "Earlier Ltd"),
      ],
    );

    expect(worked.map((work) => work.pair.id)).toEqual(["a"]);
    expect(worked[0].last.companyName).toBe("Later Ltd");
  });
});
