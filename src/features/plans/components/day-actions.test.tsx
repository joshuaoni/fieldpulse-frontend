import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DayActions } from "./day-actions";
import type { Plan, PlannedStop } from "../types";

const clearDay = vi.fn();
const swapDays = vi.fn();

vi.mock("../api", () => ({
  clearDay: (...args: unknown[]) => clearDay(...args),
  swapDays: (...args: unknown[]) => swapDays(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** The Monday `weeks` weeks from this one, as an ISO timestamp. */
function monday(weeks: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + weeks * 7);
  return date.toISOString();
}

const stop = (id: string, status: PlannedStop["status"] = "PLANNED"): PlannedStop => ({
  id,
  leadId: `lead-${id}`,
  scheduledFor: null,
  stopOrder: 0,
  routeEstimated: false,
  legMinutes: null,
  returnMinutes: null,
  status,
  lead: { id: `lead-${id}`, companyName: id, address: null, sector: null, lat: null, lng: null },
});

function show(days: PlannedStop[][], { dayIndex = 0, weeks = 1 } = {}) {
  const plan = {
    id: "plan-1",
    pairId: "pair-1",
    weekStart: monday(weeks),
    status: "DRAFT",
    generatedAt: "",
    publishedAt: null,
    visits: days.flat(),
  } as Plan;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <DayActions plan={plan} days={days} dayIndex={dayIndex} busy={false} />
    </QueryClientProvider>,
  );
}

const week = (byDay: Record<number, PlannedStop[]>) =>
  Array.from({ length: 5 }, (_, index) => byDay[index] ?? []);

const swapControl = () => screen.getByRole("combobox", { name: /Swap Monday with/ });

describe("swapping a day with another", () => {
  it("asks first, saying what moves where, then trades the two days", async () => {
    swapDays.mockResolvedValue({});
    show(week({ 0: [stop("a"), stop("b")], 1: [stop("c")] }));

    fireEvent.click(swapControl());
    fireEvent.click(screen.getByRole("option", { name: /Tuesday/ }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Monday's 2 stops move to Tuesday");
    expect(dialog.textContent).toContain("Tuesday's 1 stop moves to Monday");
    expect(swapDays).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Swap days" }));

    await waitFor(() =>
      expect(swapDays).toHaveBeenCalledWith(
        { planId: "plan-1", from: 0, to: 1 },
        expect.anything(),
      ),
    );
  });

  // The API refuses a day a rep has started on; it is not offered.
  it("does not offer a day a rep has started on", () => {
    show(week({ 0: [stop("a")], 2: [stop("c", "CHECKED_IN")] }));

    fireEvent.click(swapControl());

    expect(screen.getByRole("option", { name: /Wednesday/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("option", { name: /Tuesday/ }).hasAttribute("disabled")).toBe(false);
  });
});

describe("clearing a day", () => {
  it("asks first, then empties the day", async () => {
    clearDay.mockResolvedValue({});
    show(week({ 0: [stop("a"), stop("b")] }));

    fireEvent.click(screen.getByRole("button", { name: /Clear Monday/ }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("all 2 stops");
    expect(clearDay).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Clear Monday" }));

    await waitFor(() =>
      expect(clearDay).toHaveBeenCalledWith({ planId: "plan-1", dayIndex: 0 }, expect.anything()),
    );
  });

  it("has nothing to clear on an empty day", () => {
    show(week({ 1: [stop("b")] }));

    expect(screen.getByRole("button", { name: /Clear Monday/ }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("leaves a day alone once a rep has started on it", () => {
    show(week({ 0: [stop("a", "COMPLETED"), stop("b")] }));

    expect(screen.getByRole("button", { name: /Clear Monday/ }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(swapControl().hasAttribute("disabled")).toBe(true);
  });

  // A past day keeps what happened on it.
  it("leaves a day that has passed alone", () => {
    show(week({ 0: [stop("a", "MISSED")] }), { weeks: -1 });

    expect(screen.getByRole("button", { name: /Clear Monday/ }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(swapControl().hasAttribute("disabled")).toBe(true);
  });
});
