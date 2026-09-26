import { describe, expect, it } from "vitest";
import type { Visit } from "./types";
import {
  driveLabel,
  partnersOf,
  plannedDays,
  repStatus,
  shownStatus,
  visitsByDay,
  weekStartOf,
} from "./week";

const MONDAY = new Date("2026-09-21T00:00:00.000Z");

const lead = (id: string, companyName: string, address: string | null) => ({
  id,
  companyName,
  address,
  phone: null,
  lat: null,
  lng: null,
});

const visit = (overrides: Partial<Visit> = {}): Visit =>
  ({
    id: "visit-1",
    leadId: "lead-1",
    lead: lead("lead-1", "Capital Starters", "Ozumba Mbadiwe, VI"),
    pairId: "pair-1",
    status: "PLANNED",
    scheduledFor: MONDAY.toISOString(),
    planId: "plan-1",
    stopOrder: 0,
    legMinutes: 12,
    returnMinutes: null,
    createdAt: MONDAY.toISOString(),
    updatedAt: MONDAY.toISOString(),
    attendances: [],
    ...overrides,
  }) as Visit;

describe("laying a week out", () => {
  it("puts each visit under the day it is booked for", () => {
    const days = visitsByDay(
      [
        visit({ id: "mon" }),
        visit({ id: "wed", scheduledFor: "2026-09-23T00:00:00.000Z" }),
      ],
      MONDAY,
    );

    expect(days[0].map((v) => v.id)).toEqual(["mon"]);
    expect(days[2].map((v) => v.id)).toEqual(["wed"]);
    expect(days[1]).toEqual([]);
  });

  // The order is the route, not the order the API happened to return.
  it("keeps each day in route order", () => {
    const days = visitsByDay(
      [visit({ id: "third", stopOrder: 2 }), visit({ id: "first", stopOrder: 0 })],
      MONDAY,
    );

    expect(days[0].map((v) => v.id)).toEqual(["first", "third"]);
  });

  it("sorts a visit nobody planned to the end of its day", () => {
    const days = visitsByDay(
      [visit({ id: "unplanned", stopOrder: null }), visit({ id: "planned", stopOrder: 1 })],
      MONDAY,
    );

    expect(days[0].map((v) => v.id)).toEqual(["planned", "unplanned"]);
  });

  // A weekend visit, or one from another week, belongs to neither column.
  it("leaves out anything outside Monday to Friday", () => {
    const days = visitsByDay(
      [visit({ scheduledFor: "2026-09-26T00:00:00.000Z" }), visit({ scheduledFor: null })],
      MONDAY,
    );

    expect(days.flat()).toEqual([]);
  });

  it("counts a planned route for each day that holds something", () => {
    const days = visitsByDay(
      [visit(), visit({ scheduledFor: "2026-09-23T00:00:00.000Z" })],
      MONDAY,
    );

    expect(plannedDays(days)).toBe(2);
  });

  it("starts the week on Monday, whatever day it is asked on", () => {
    expect(weekStartOf(new Date("2026-09-24T15:00:00.000Z"))).toEqual(MONDAY);
    expect(weekStartOf(MONDAY)).toEqual(MONDAY);
  });
});

describe("who the rep is out with", () => {
  const pair = {
    id: "pair-1",
    name: null,
    members: [
      { user: { id: "me", firstName: "Chisom", lastName: "Ifechukwu" } },
      { user: { id: "them", firstName: "Dayo", lastName: "Lekan" } },
    ],
  };

  it("names the partner, never the rep themselves", () => {
    const partners = partnersOf([visit({ pair })] as Visit[], "me");

    expect(partners.map((member) => member.user.firstName)).toEqual(["Dayo"]);
  });

  it("names nobody on a day with no stops", () => {
    expect(partnersOf([], "me")).toEqual([]);
  });
});

/**
 * The drive is said from where the rep is coming: the office for the first
 * call of the day, the stop before it for every other.
 */
describe("the drive to a stop", () => {
  it("counts the first call from the office", () => {
    expect(driveLabel(visit({ legMinutes: 12 }), 0)).toBe("12 min from the office");
  });

  it("counts every other from the stop before", () => {
    expect(driveLabel(visit({ legMinutes: 8 }), 1)).toBe("8 min drive");
  });

  it("reads an hour as an hour", () => {
    expect(driveLabel(visit({ legMinutes: 75 }), 1)).toBe("1 hr 15 min drive");
  });

  // A day nobody routed has no drive times, and inventing one would be a lie.
  it("says nothing when the day was never routed", () => {
    expect(driveLabel(visit({ legMinutes: null }), 1)).toBeNull();
  });
});

/**
 * `Visit.status` is rolled up from both attendances — CHECKED_IN while either
 * rep is on site, COMPLETED once everyone who checked in has checked out. On
 * a rep's own screens that is the wrong subject: a partner finishing a call
 * marked it Visited for someone who never went, and counted towards their
 * day.
 */
describe("where this rep stands on a visit", () => {
  const attendance = (repId: string, checkInAt: string | null, checkOutAt: string | null) =>
    ({ id: `att-${repId}`, repId, checkInAt, checkOutAt }) as Visit["attendances"][number];

  const NOW = "2026-09-25T15:00:00.000Z";

  it("does not call it visited because the partner went", () => {
    const v = visit({
      status: "COMPLETED",
      attendances: [attendance("them", NOW, NOW), attendance("me", null, null)],
    });

    expect(repStatus(v, "me")).toBe("PLANNED");
    expect(repStatus(v, "them")).toBe("COMPLETED");
  });

  it("does not call it on site because the partner arrived", () => {
    const v = visit({
      status: "CHECKED_IN",
      attendances: [attendance("them", NOW, null), attendance("me", null, null)],
    });

    expect(repStatus(v, "me")).toBe("PLANNED");
  });

  it("says on site once this rep has arrived", () => {
    const v = visit({ status: "CHECKED_IN", attendances: [attendance("me", NOW, null)] });

    expect(repStatus(v, "me")).toBe("CHECKED_IN");
  });

  it("says visited once this rep has checked out", () => {
    const v = visit({ status: "CHECKED_IN", attendances: [attendance("me", NOW, NOW)] });

    expect(repStatus(v, "me")).toBe("COMPLETED");
  });

  // Nobody went, so there is no attendance to read: this one is the visit's.
  it("keeps missed, which belongs to the visit rather than a person", () => {
    const v = visit({ status: "MISSED", attendances: [] });

    expect(repStatus(v, "me")).toBe("MISSED");
  });
});

/**
 * Which of those two answers a screen should print.
 *
 * The badge on a visit was always the pair's, so a rep walking into their
 * second shop of the day was told they were "On site" there — beside a panel
 * saying they were still checked in at the first one.
 */
describe("the standing shown beside a visit", () => {
  const pair = {
    id: "pair-1",
    name: null,
    members: [
      { user: { id: "me", firstName: "Chisom", lastName: "Ifechukwu" } },
      { user: { id: "them", firstName: "Dayo", lastName: "Lekan" } },
    ],
  };

  const attendance = (repId: string, checkInAt: string | null, checkOutAt: string | null) =>
    ({ id: `att-${repId}`, repId, checkInAt, checkOutAt }) as Visit["attendances"][number];

  const NOW = "2026-09-26T15:00:00.000Z";

  it("does not put a rep on site at a shop their partner is standing in", () => {
    const v = visit({
      status: "CHECKED_IN",
      pair,
      attendances: [attendance("them", NOW, null)],
    });

    expect(shownStatus(v, "me")).toBe("PLANNED");
  });

  it("says on site once the rep themselves has arrived", () => {
    const v = visit({ status: "CHECKED_IN", pair, attendances: [attendance("me", NOW, null)] });

    expect(shownStatus(v, "me")).toBe("CHECKED_IN");
  });

  // A manager is not on the visit, so the pair's roll-up is exactly the
  // answer they want: has anybody arrived?
  it("gives a manager the pair's standing, not one rep's", () => {
    const v = visit({
      status: "CHECKED_IN",
      pair,
      attendances: [attendance("them", NOW, null)],
    });

    expect(shownStatus(v, "manager-1")).toBe("CHECKED_IN");
  });

  it("falls back to the visit's own when nobody is looking in particular", () => {
    const v = visit({ status: "COMPLETED", pair, attendances: [] });

    expect(shownStatus(v, undefined)).toBe("COMPLETED");
  });

  // A rep with an attendance row but no pair membership loaded is still on
  // this visit — the row is the stronger evidence of the two.
  it("counts a rep by their own attendance when the pair is not loaded", () => {
    const v = visit({ status: "CHECKED_IN", attendances: [attendance("me", NOW, NOW)] });

    expect(shownStatus(v, "me")).toBe("COMPLETED");
  });
});
