import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RepHomeScreen } from "./rep-home-screen";
import type { Visit, VisitAttendance, VisitStatus } from "../types";

const fetchMyVisits = vi.fn();

vi.mock("../api", () => ({
  fetchMyVisits: (...args: unknown[]) => fetchMyVisits(...args),
  fetchVisit: vi.fn(),
  fetchTeamVisits: vi.fn(),
  checkIn: vi.fn(),
  checkOut: vi.fn(),
  submitReport: vi.fn(),
}));

vi.mock("@/features/reminders/api", () => ({ fetchReminderSchedule: vi.fn(async () => []) }));
vi.mock("@/features/field-roles/api", () => ({
  fetchMyFieldRole: vi.fn(async () => ({ fieldRole: "FIELD_REP" })),
}));

vi.mock("@/lib/session", () => ({
  useSession: () => ({
    user: { id: "me", firstName: "Chisom", lastName: "Ifechukwu" },
    status: "authenticated",
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const attendance = (repId: string, overrides: Partial<VisitAttendance> = {}): VisitAttendance =>
  ({
    id: `att-${repId}`,
    repId,
    checkInLat: null,
    checkInLng: null,
    checkInPhotoUrl: null,
    checkInAt: null,
    checkOutLat: null,
    checkOutLng: null,
    checkOutAt: null,
    clientLocalCheckInAt: null,
    clientLocalCheckOutAt: null,
    ...overrides,
  }) as VisitAttendance;

const visit = (status: VisitStatus, attendances: VisitAttendance[]): Visit =>
  ({
    id: "visit-1",
    leadId: "lead-1",
    lead: { id: "lead-1", companyName: "Capital Partners", address: "VI, Lekki" },
    pairId: "pair-1",
    status,
    scheduledFor: new Date().toISOString(),
    planId: "plan-1",
    stopOrder: 0,
    legMinutes: null,
    returnMinutes: null,
    createdAt: "",
    updatedAt: "",
    attendances,
  }) as Visit;

beforeEach(() => {
  fetchMyVisits.mockResolvedValue({
    visits: [],
    pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
  });
});

function show(visits: Visit[]) {
  fetchMyVisits.mockResolvedValue({
    visits,
    pagination: { page: 1, pageSize: 100, totalItems: visits.length, totalPages: 1 },
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RepHomeScreen />
    </QueryClientProvider>,
  );
}

/**
 * A visit is CHECKED_IN while *either* of the pair is on site, so the card
 * cannot read the visit's status to decide what this rep should do next —
 * the action it offers has to match the screen behind the button.
 */
describe("the card that says what to do now", () => {
  it("offers Check In when only the partner has arrived", async () => {
    show([
      visit("CHECKED_IN", [
        attendance("partner", { checkInAt: new Date().toISOString() }),
        attendance("me"),
      ]),
    ]);

    expect(await screen.findByText("Check In")).toBeDefined();
    expect(screen.getByText("Next")).toBeDefined();
  });

  it("offers Check Out once this rep is on site", async () => {
    show([
      visit("CHECKED_IN", [attendance("me", { checkInAt: new Date().toISOString() })]),
    ]);

    expect(await screen.findByText("Check Out")).toBeDefined();
    expect(screen.getByText("Active")).toBeDefined();
  });

  // Their own record decides, whichever way round the pair went.
  it("offers Check In when the partner has already been and gone", async () => {
    show([
      visit("COMPLETED", [
        attendance("partner", {
          checkInAt: new Date().toISOString(),
          checkOutAt: new Date().toISOString(),
        }),
        attendance("me"),
      ]),
    ]);

    expect(await screen.findByText("Check In")).toBeDefined();
  });

  it("says the day is done once this rep has checked out of everything", async () => {
    show([
      visit("COMPLETED", [
        attendance("me", {
          checkInAt: new Date().toISOString(),
          checkOutAt: new Date().toISOString(),
        }),
      ]),
    ]);

    expect(await screen.findByText("Nothing left today")).toBeDefined();
  });
});
