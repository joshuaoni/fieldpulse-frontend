import { describe, expect, it } from "vitest";
import type { Reminder } from "@/features/reminders/types";
import type { Visit } from "@/features/visits/types";
import { buildFeed, byDay, rangeStart } from "./types";

const NOW = new Date("2026-09-26T15:00:00.000Z");

const reminder = (overrides: Partial<Reminder> = {}): Reminder =>
  ({
    id: "rem-1",
    kind: "DEPARTURE",
    scheduledFor: "2026-09-26T07:45:00.000Z",
    visitDay: "2026-09-26T00:00:00.000Z",
    visit: { legMinutes: 4, lead: { companyName: "Capital Starters" } },
    ...overrides,
  }) as Reminder;

const visit = (overrides: Partial<Visit> = {}): Visit =>
  ({
    id: "visit-1",
    leadId: "lead-1",
    lead: { id: "lead-1", companyName: "Bright Field Ltd", address: null },
    pairId: "pair-1",
    status: "COMPLETED",
    scheduledFor: "2026-09-26T00:00:00.000Z",
    planId: "plan-1",
    stopOrder: 0,
    createdAt: "2026-09-21T09:00:00.000Z",
    updatedAt: "2026-09-26T12:00:00.000Z",
    attendances: [],
    ...overrides,
  }) as Visit;

const report = (overrides = {}) =>
  ({
    id: "report-1",
    notes: "Keen.",
    outcome: "INTERESTED",
    submittedAt: "2026-09-26T13:05:00.000Z",
    attendance: { rep: { id: "me" } },
    ...overrides,
  }) as Visit["report"];

describe("what reaches a rep's notifications", () => {
  it("speaks a departure reminder the way the screen reads it", () => {
    const [item] = buildFeed({ reminders: [reminder()], visits: [], repId: "me", now: NOW });

    expect(item.title).toBe("Check-in reminder");
    expect(item.body).toBe("You're 4 min from Capital Starters, your next stop.");
  });

  // A reminder that has not fired is a plan, and the rep already has the
  // day's route for that.
  it("leaves out a reminder that is not due yet", () => {
    const later = reminder({ scheduledFor: "2026-09-26T16:30:00.000Z" });

    expect(buildFeed({ reminders: [later], visits: [], repId: "me", now: NOW })).toEqual([]);
  });

  it("confirms a report this rep filed", () => {
    const feed = buildFeed({
      reminders: [],
      visits: [visit({ report: report() })],
      repId: "me",
      now: NOW,
    });

    expect(feed[0].body).toBe("Your report for Bright Field Ltd was submitted successfully.");
    expect(feed[0].href).toBe("/visits/visit-1");
  });

  it("says nothing about a report the partner filed", () => {
    const theirs = visit({ report: report({ attendance: { rep: { id: "them" } } }) });

    expect(buildFeed({ reminders: [], visits: [theirs], repId: "me", now: NOW })).toEqual([]);
  });

  /**
   * Every visit in a published week was "added" the moment the plan was
   * generated. Announcing those would post the whole route back to the rep
   * each Monday, so only a stop arranged outside a plan is news.
   */
  it("announces a stop added outside the plan, and only that", () => {
    const feed = buildFeed({
      reminders: [],
      visits: [visit(), visit({ id: "extra", planId: null })],
      repId: "me",
      now: NOW,
    });

    expect(feed.map((item) => item.id)).toEqual(["visit:extra"]);
    expect(feed[0].title).toBe("New stop added");
  });

  it("puts the newest first, whatever it came from", () => {
    const feed = buildFeed({
      reminders: [reminder()],
      visits: [visit({ report: report() })],
      repId: "me",
      now: NOW,
    });

    expect(feed.map((item) => item.kind)).toEqual(["REPORT_SUBMITTED", "REMINDER"]);
  });
});

describe("the day headings", () => {
  it("names today and yesterday, and dates anything older", () => {
    const days = byDay(
      [
        { id: "a", kind: "REMINDER", title: "", body: "", at: "2026-09-26T09:00:00.000Z" },
        { id: "b", kind: "REMINDER", title: "", body: "", at: "2026-09-25T09:00:00.000Z" },
        { id: "c", kind: "REMINDER", title: "", body: "", at: "2026-09-20T09:00:00.000Z" },
      ],
      NOW,
    );

    expect(days.map((group) => group.label).slice(0, 2)).toEqual(["Today", "Yesterday"]);
    expect(days[2].label).not.toBe("Yesterday");
  });
});

describe("the range a filter asks for", () => {
  it("opens this morning for today", () => {
    expect(rangeStart("TODAY", NOW).getDate()).toBe(NOW.getDate());
  });

  it("reaches back a week and a month", () => {
    const week = rangeStart("WEEK", NOW);
    const month = rangeStart("MONTH", NOW);

    expect(Math.round((NOW.getTime() - week.getTime()) / 86_400_000)).toBeGreaterThanOrEqual(6);
    expect(Math.round((NOW.getTime() - month.getTime()) / 86_400_000)).toBeGreaterThanOrEqual(29);
  });
});
