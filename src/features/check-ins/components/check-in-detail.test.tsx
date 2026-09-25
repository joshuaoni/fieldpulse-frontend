import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckInDetail } from "./check-in-detail";
import type { CheckIn } from "../types";

afterEach(cleanup);

const REP = { id: "rep-1", firstName: "David", lastName: "Okoro" };
const PARTNER = { id: "rep-2", firstName: "Zainab", lastName: "Bello" };

const checkIn = (overrides: Partial<CheckIn> = {}): CheckIn => ({
  attendanceId: "att-1",
  visitId: "visit-1",
  status: "VERIFIED",
  concerns: [],
  pairId: "pair-1",
  pair: {
    id: "pair-1",
    name: null,
    members: [{ user: REP }, { user: PARTNER }],
  },
  lead: { id: "lead-1", companyName: "Capital Starters", address: "Ikoyi, Lagos Nigeria" },
  rep: REP,
  checkInAt: "2026-09-23T13:15:00.000Z",
  photoUrl: "https://signed.test/a.jpg",
  distanceM: 40,
  departureDistanceM: 40,
  accuracyM: 12,
  departureAccuracyM: 12,
  dayProgress: { done: 3, total: 5 },
  report: {
    notes: "Very keen on the new packaging line. Wants a formal quote by Friday.",
    outcome: "INTERESTED",
    submittedAt: "2026-09-23T15:40:00.000Z",
    by: PARTNER,
  },
  ...overrides,
});

describe("the check-in a manager opens", () => {
  it("names the lead, the pair and the rep whose check-in this is", () => {
    render(<CheckInDetail checkIn={checkIn()} onClose={vi.fn()} />);

    expect(screen.getByText("Capital Starters")).toBeDefined();
    expect(screen.getByText("Ikoyi, Lagos Nigeria")).toBeDefined();
    expect(screen.getByText("David & Zainab")).toBeDefined();
    expect(screen.getByText(/Checked in by David/)).toBeDefined();
  });

  /**
   * The point of the whole thing: one report per visit, so the row a manager
   * opens is often not the rep who wrote it. The account still shows, and it
   * says whose it is rather than implying it belongs to this row.
   */
  it("shows the partner's report on this rep's check-in, naming the author", () => {
    render(<CheckInDetail checkIn={checkIn()} onClose={vi.fn()} />);

    expect(screen.getByText(/Very keen on the new packaging line/)).toBeDefined();
    expect(screen.getByText(/written up by Zainab/)).toBeDefined();
  });

  it("says plainly when neither rep has written the visit up", () => {
    render(<CheckInDetail checkIn={checkIn({ report: null })} onClose={vi.fn()} />);

    expect(screen.getByText(/Neither rep has written this visit up/)).toBeDefined();
    expect(screen.getByText("Not recorded")).toBeDefined();
  });

  it("shows the outcome under its own label rather than its stored name", () => {
    const report = { ...checkIn().report!, outcome: "FOLLOW_UP_NEEDED" as const };
    render(<CheckInDetail checkIn={checkIn({ report })} onClose={vi.fn()} />);

    expect(screen.getByText("Follow-up needed")).toBeDefined();
  });

  // A flagged row with only a badge would be a dead end.
  it("says what is wrong when the check-in is flagged", () => {
    render(
      <CheckInDetail
        checkIn={checkIn({ status: "FLAGGED", concerns: ["LEFT_FROM_ELSEWHERE"], departureDistanceM: 700 })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/left from 700 m away/)).toBeDefined();
  });

  it("closes on the close button", () => {
    const onClose = vi.fn();
    render(<CheckInDetail checkIn={checkIn()} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Close"));

    expect(onClose).toHaveBeenCalled();
  });

  // Hand-rolled, because this is an overlay rather than a native dialog.
  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<CheckInDetail checkIn={checkIn()} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });

  it("leaves the page behind unscrollable while it is open", () => {
    const { unmount } = render(<CheckInDetail checkIn={checkIn()} onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
