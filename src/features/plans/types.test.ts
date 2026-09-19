import { describe, expect, it } from "vitest";
import {
  dayDriveMinutes,
  dayIndexOf,
  dayIsEstimated,
  formatMinutes,
  loopKm,
  pairLabel,
  stopsByDay,
  type Plan,
  type PlannedStop,
} from "./types";

const MONDAY = "2026-09-14T00:00:00.000Z";

const stop = (
  id: string,
  day: string | null,
  stopOrder: number | null,
  routeEstimated = false,
): PlannedStop => ({
  id,
  leadId: `lead-${id}`,
  scheduledFor: day,
  stopOrder,
  routeEstimated,
  legMinutes: null,
  returnMinutes: null,
  status: "PLANNED",
  lead: {
    id: `lead-${id}`,
    companyName: `Shop ${id}`,
    address: null,
    sector: null,
    lat: null,
    lng: null,
  },
});

/** The same stop, but somewhere — for the geometry helpers. */
const at = (id: string, lat: number, lng: number): PlannedStop => {
  const placed = stop(id, MONDAY, 0);
  return { ...placed, lead: { ...placed.lead, lat, lng } };
};

const member = (firstName: string) => ({
  user: { id: firstName, firstName, lastName: "Okafor" },
});

const planWith = (visits: PlannedStop[]): Plan => ({
  id: "plan-1",
  pairId: "pair-1",
  weekStart: MONDAY,
  status: "DRAFT",
  generatedAt: MONDAY,
  publishedAt: null,
  visits,
});

describe("dayIndexOf", () => {
  it.each([
    ["2026-09-14T00:00:00.000Z", 0],
    ["2026-09-16T00:00:00.000Z", 2],
    ["2026-09-18T00:00:00.000Z", 4],
  ])("puts %s in column %i", (day, expected) => {
    expect(dayIndexOf(stop("a", day, 0), MONDAY)).toBe(expected);
  });

  // A stop with no day is not dropped from the grid; it shows on Monday where
  // a manager will see and place it.
  it("falls back to the first column when a stop has no day", () => {
    expect(dayIndexOf(stop("a", null, 0), MONDAY)).toBe(0);
  });
});

describe("stopsByDay", () => {
  it("groups stops into weekday columns", () => {
    const days = stopsByDay(
      planWith([
        stop("a", "2026-09-14T00:00:00.000Z", 0),
        stop("b", "2026-09-16T00:00:00.000Z", 0),
        stop("c", "2026-09-14T00:00:00.000Z", 1),
      ]),
    );

    expect(days[0].map((s) => s.id)).toEqual(["a", "c"]);
    expect(days[2].map((s) => s.id)).toEqual(["b"]);
    expect(days[1]).toEqual([]);
  });

  /**
   * The order is the route out from the office and back, so it has to survive
   * whatever order the API happened to return.
   */
  it("keeps each day in route order regardless of how it arrived", () => {
    const days = stopsByDay(
      planWith([
        stop("third", "2026-09-14T00:00:00.000Z", 2),
        stop("first", "2026-09-14T00:00:00.000Z", 0),
        stop("second", "2026-09-14T00:00:00.000Z", 1),
      ]),
    );

    expect(days[0].map((s) => s.id)).toEqual(["first", "second", "third"]);
  });

  // A weekend stop would otherwise land outside the grid and vanish.
  it("ignores a stop beyond the working week rather than overflowing the grid", () => {
    const days = stopsByDay(planWith([stop("saturday", "2026-09-19T00:00:00.000Z", 0)]));

    expect(days).toHaveLength(5);
    expect(days.flat()).toEqual([]);
  });
});

/**
 * Flagged per day rather than per plan: the maps service fails for one day
 * and not another, and which day is the part a manager can act on before
 * publishing.
 */
describe("dayIsEstimated", () => {
  it("marks a day whose route came from an estimate", () => {
    expect(dayIsEstimated([stop("a", MONDAY, 0, true), stop("b", MONDAY, 1, true)])).toBe(true);
  });

  it("leaves a day ordered on real driving time unmarked", () => {
    expect(dayIsEstimated([stop("a", MONDAY, 0), stop("b", MONDAY, 1)])).toBe(false);
  });

  it("says nothing about a day with no stops", () => {
    expect(dayIsEstimated([])).toBe(false);
  });
});

/**
 * Pairs are created as two people and naming them is optional, so most have
 * no name at all — a constant fallback printed the same heading on every plan
 * in the week and made the grid unreadable.
 */
describe("pairLabel", () => {
  const withPair = (pair: Plan["pair"]): Plan => ({ ...planWith([]), pairId: "abcdef1234", pair });

  it("uses the pair's own name when it has one", () => {
    expect(
      pairLabel(
        withPair({ id: "p", name: "Island team", members: [member("Ada"), member("Bola")] }),
      ),
    ).toBe("Island team");
  });

  it("falls back to who is in the pair", () => {
    expect(
      pairLabel(withPair({ id: "p", name: null, members: [member("Ada"), member("Bola")] })),
    ).toBe("Ada & Bola");
  });

  // A name of only spaces is not a name.
  it("ignores a blank name", () => {
    expect(pairLabel(withPair({ id: "p", name: "   ", members: [member("Ada")] }))).toBe("Ada");
  });

  it("falls back to the id when there is neither a name nor a member", () => {
    expect(pairLabel(withPair({ id: "p", name: null, members: [] }))).toBe("Pair abcdef12");
  });

  it("survives a plan the API returned without its pair", () => {
    expect(pairLabel(withPair(undefined))).toBe("Pair abcdef12");
  });
});

describe("loopKm", () => {
  const office = { lat: 6.6, lng: 3.35 };

  // Out and back, so a single stop is counted twice.
  it("closes the loop at the office", () => {
    const oneWay = 1.1; // ~0.01 degrees of latitude
    expect(loopKm(office, [at("a", 6.61, 3.35)])).toBeCloseTo(oneWay * 2, 1);
  });

  /**
   * Three stops, not two: any two-stop loop is the same length in either
   * direction, so it cannot tell a good order from a bad one.
   */
  it("adds the legs between stops in the order given", () => {
    const nearest = [at("a", 6.61, 3.35), at("b", 6.62, 3.35), at("c", 6.63, 3.35)];
    const doublingBack = [at("c", 6.63, 3.35), at("a", 6.61, 3.35), at("b", 6.62, 3.35)];

    expect(loopKm(office, nearest)).toBeLessThan(loopKm(office, doublingBack));
  });

  /**
   * A lead that was never geocoded still belongs in the route list, so it is
   * skipped here rather than treated as (0, 0) — which would put it in the
   * Gulf of Guinea and report a 700 km day.
   */
  it("skips stops with no coordinates", () => {
    expect(loopKm(office, [stop("nowhere", MONDAY, 0)])).toBe(0);
    expect(loopKm(office, [at("a", 6.61, 3.35), stop("nowhere", MONDAY, 1)])).toBeCloseTo(2.2, 1);
  });
});

/** A stop with its measured legs, as the planner writes them. */
const timed = (
  id: string,
  legMinutes: number,
  returnMinutes: number | null = null,
): PlannedStop => ({
  ...stop(id, MONDAY, 0),
  legMinutes,
  returnMinutes,
});

describe("dayDriveMinutes", () => {
  it("adds every leg plus the drive home", () => {
    expect(dayDriveMinutes([timed("a", 18), timed("b", 12), timed("c", 9, 25)])).toBe(64);
  });

  /**
   * After a manager moves a stop the backend drops the day's measured legs.
   * Summing what survives would report a shorter drive than the day really
   * takes, so the whole figure is withheld instead.
   */
  it("says nothing rather than under-reporting when a leg is missing", () => {
    const stops = [timed("a", 18), { ...timed("b", 0, 25), legMinutes: null }];
    expect(dayDriveMinutes(stops)).toBeNull();
  });

  // The drive home lives on the last stop, so a day without it is incomplete.
  it("says nothing when the drive home was never recorded", () => {
    expect(dayDriveMinutes([timed("a", 18), timed("b", 12)])).toBeNull();
  });

  it("says nothing about an empty day", () => {
    expect(dayDriveMinutes([])).toBeNull();
  });
});

describe("formatMinutes", () => {
  it.each([
    [45, "45 min"],
    [59, "59 min"],
    [60, "1h 00m"],
    [64, "1h 04m"],
    [195, "3h 15m"],
  ])("writes %i as %s", (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });
});
