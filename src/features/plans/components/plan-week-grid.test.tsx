import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanWeekGrid } from "./plan-week-grid";
import type { Plan, PlannedStop } from "../types";

const fetchPlans = vi.fn();
const clearWeek = vi.fn();

vi.mock("../api", () => ({
  fetchPlans: (...args: unknown[]) => fetchPlans(...args),
  clearWeek: (...args: unknown[]) => clearWeek(...args),
  generatePlans: vi.fn(),
  adjustStop: vi.fn(),
  addStop: vi.fn(),
  fetchCandidateLeads: vi.fn().mockResolvedValue([]),
  removeStop: vi.fn(),
  publishWeek: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** The week the grid opens on, worked out the way the grid works it out. */
function monday(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

const stop = (id: string, company: string): PlannedStop => ({
  id,
  leadId: `lead-${id}`,
  scheduledFor: `${monday()}T00:00:00.000Z`,
  stopOrder: 1,
  routeEstimated: false,
  legMinutes: null,
  returnMinutes: null,
  status: "PLANNED",
  lead: {
    id: `lead-${id}`,
    companyName: company,
    address: null,
    sector: null,
    lat: null,
    lng: null,
  },
});

const plan = (id: string, status: Plan["status"], stops: PlannedStop[]): Plan => ({
  id,
  pairId: `pair-${id}`,
  weekStart: `${monday()}T00:00:00.000Z`,
  status,
  generatedAt: `${monday()}T00:00:00.000Z`,
  publishedAt: status === "PUBLISHED" ? `${monday()}T00:00:00.000Z` : null,
  pair: { id: `pair-${id}`, name: `Pair ${id}`, members: [] },
  visits: stops,
});

function show(plans: Plan[]) {
  fetchPlans.mockResolvedValue({ plans });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <PlanWeekGrid />
    </QueryClientProvider>,
  );
}

const clearButton = () => screen.getByRole("button", { name: /Clear week/ });

describe("clearing a week back to empty", () => {
  it("has nothing to clear when the week holds no draft", async () => {
    show([plan("1", "PUBLISHED", [stop("s1", "Capital Starters")])]);

    await screen.findByText("Pair 1");

    expect(clearButton().hasAttribute("disabled")).toBe(true);
  });

  // It cannot be undone, and regenerating afterwards starts from nothing, so
  // it says what is about to go before it goes.
  it("asks first, naming how much is about to go", async () => {
    show([plan("1", "DRAFT", [stop("s1", "Capital Starters"), stop("s2", "TouchB Empire")])]);
    await screen.findByText("Pair 1");

    fireEvent.click(clearButton());

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("2 planned stops");
    expect(clearWeek).not.toHaveBeenCalled();
  });

  it("clears the week once that is confirmed, and leaves it empty", async () => {
    show([plan("1", "DRAFT", [stop("s1", "Capital Starters")])]);
    await screen.findByText("Pair 1");

    fireEvent.click(clearButton());
    clearWeek.mockResolvedValue({ plans: 1, stops: 1 });
    fetchPlans.mockResolvedValue({ plans: [] });

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear week" }));

    await waitFor(() => expect(clearWeek).toHaveBeenCalledWith(monday()));
    expect(await screen.findByText(/No plans for this week yet/)).toBeDefined();
  });

  // A week can hold both; publishing is the one-way door, so those stay.
  it("says the published plans are keeping their place", async () => {
    show([
      plan("1", "DRAFT", [stop("s1", "Capital Starters")]),
      plan("2", "PUBLISHED", [stop("s2", "TouchB Empire")]),
    ]);
    await screen.findByText("Pair 1");

    fireEvent.click(clearButton());

    expect((await screen.findByRole("dialog")).textContent).toContain("already published stays");
  });
});
