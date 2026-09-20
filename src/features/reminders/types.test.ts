import { describe, expect, it } from "vitest";
import { describeReminder, overdueReminders, type Reminder } from "./types";

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: "r1",
  kind: "DEPARTURE",
  scheduledFor: "2026-09-16T06:45:00.000Z",
  visitDay: "2026-09-16T00:00:00.000Z",
  visit: { legMinutes: 23, lead: { companyName: "Mama Chidi Hardware" } },
  ...overrides,
});

/**
 * The wording is built here as well as on the server so a prompt the device
 * fires by itself reads the same as one that arrived over the network — a rep
 * should not be able to tell which channel reached them.
 */
describe("describeReminder", () => {
  it("names the first stop and its drive", () => {
    const described = describeReminder(reminder());

    expect(described.title).toBe("Time to set off");
    expect(described.body).toContain("Mama Chidi Hardware");
    expect(described.body).toContain("23 min");
  });

  // A day whose legs were cleared by a mid-week edit has no drive time.
  it("leaves the drive out when it is not known", () => {
    const described = describeReminder(
      reminder({ visit: { legMinutes: null, lead: { companyName: "Punch Agency" } } }),
    );

    expect(described.body).toContain("Punch Agency");
    expect(described.body).not.toContain("min away");
  });

  it("falls back when the stop has gone", () => {
    const described = describeReminder(reminder({ visit: null }));

    expect(described.body).toBe("Your first visit is coming up.");
  });

  it("writes the end-of-day prompt", () => {
    const described = describeReminder(reminder({ kind: "END_OF_DAY", visit: null }));

    expect(described.title).toBe("Reports still to submit");
  });
});

/**
 * The gap this closes: a phone that cannot schedule its own notifications, and
 * a rep who was offline when the push went out. The prompt never arrived, so
 * they are told the moment they open the app.
 */
describe("overdueReminders", () => {
  const now = new Date("2026-09-16T09:00:00.000Z");

  it("surfaces a prompt whose time passed while the app was closed", () => {
    const missed = overdueReminders([reminder()], now);

    expect(missed.map((item) => item.id)).toEqual(["r1"]);
  });

  it("leaves a prompt that is still ahead alone", () => {
    const later = reminder({ id: "later", scheduledFor: "2026-09-16T16:00:00.000Z" });

    expect(overdueReminders([later], now)).toEqual([]);
  });

  // Yesterday's prompt is not worth showing this morning.
  it("ignores anything from a previous day", () => {
    const yesterday = reminder({ id: "old", scheduledFor: "2026-09-15T06:45:00.000Z" });

    expect(overdueReminders([yesterday], now)).toEqual([]);
  });
});
