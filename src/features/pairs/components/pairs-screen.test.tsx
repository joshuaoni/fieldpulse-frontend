import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PairsScreen } from "./pairs-screen";
import type { SalesPair } from "../types";

const fetchPairs = vi.fn();

vi.mock("../api", () => ({
  fetchPairs: (...args: unknown[]) => fetchPairs(...args),
  fetchAssignableReps: vi.fn().mockResolvedValue([]),
  createPair: vi.fn(),
  addPairMember: vi.fn(),
  removePairMember: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const member = (id: string, firstName: string, lastName: string) => ({
  id: `m-${id}`,
  userId: id,
  startedAt: "2026-09-01T00:00:00.000Z",
  endedAt: null,
  user: { id, firstName, lastName, email: "", profileImageUrl: null },
});

const pair = (day: SalesPair["day"]): SalesPair => ({
  id: "pair-1",
  name: null,
  isActive: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  members: [member("u1", "Chisom", "Ifechukwu"), member("u2", "Ademola", "Lekan")],
  day,
});

const onCall = pair({
  date: "2026-09-23T00:00:00.000Z",
  current: {
    visitId: "v1",
    leadId: "l1",
    companyName: "Capital Starters",
    address: "12 Awolowo Road, Ikoyi",
  },
  progress: { done: 1, total: 6 },
  week: { done: 18, total: 30 },
});

function show(pairs: SalesPair[] = [onCall]) {
  fetchPairs.mockResolvedValue(pairs);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <PairsScreen />
    </QueryClientProvider>,
  );
}

const today = () => new Date().toISOString().slice(0, 10);

describe("the day the roster describes", () => {
  it("opens on today and says so", async () => {
    show();

    await waitFor(() => expect(fetchPairs).toHaveBeenCalledWith(today()));
    expect(screen.getByText(/Today/)).toBeDefined();
  });

  it("steps back a day and asks for that one instead", async () => {
    show();
    await waitFor(() => expect(fetchPairs).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText("Previous day"));

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await waitFor(() =>
      expect(fetchPairs).toHaveBeenCalledWith(yesterday.toISOString().slice(0, 10)),
    );
  });

  // Getting back to today should not mean counting clicks.
  it("offers a way back to today, and only once you have left it", async () => {
    show();
    await waitFor(() => expect(fetchPairs).toHaveBeenCalled());
    expect(screen.queryByText("Today")).toBeNull();

    fireEvent.click(screen.getByLabelText("Next day"));
    fireEvent.click(await screen.findByText("Today"));

    await waitFor(() => expect(screen.queryByText("Today")).toBeNull());
    expect(screen.getByText(/Today ·/)).toBeDefined();
  });
});

/**
 * The gap this closes: at eight in the morning every day count is zero, and
 * on a Saturday there is no day at all. The week figure is what keeps the row
 * worth reading.
 */
describe("what a row says when the day is quiet", () => {
  it("shows the week beside the day", async () => {
    show();

    expect(await screen.findByText("1 of 6")).toBeDefined();
    expect(screen.getByText("18 of 30 this week")).toBeDefined();
  });

  it("still reports the week on a day the pair is not out", async () => {
    show([
      pair({
        date: "2026-09-26T00:00:00.000Z",
        current: null,
        progress: { done: 0, total: 0 },
        week: { done: 18, total: 30 },
      }),
    ]);

    expect(await screen.findByText("Nothing that day")).toBeDefined();
    expect(screen.getByText("18 of 30 this week")).toBeDefined();
  });

  /**
   * A finished day and a day nobody planned both have no current call. They
   * must not read the same — one is a good day's work, the other is a gap.
   */
  it("tells a finished day apart from an unplanned one", async () => {
    show([
      pair({
        date: "2026-09-23T00:00:00.000Z",
        current: null,
        progress: { done: 6, total: 6 },
        week: { done: 24, total: 30 },
      }),
    ]);

    expect(await screen.findByText("Day complete")).toBeDefined();
    expect(screen.getByText("6 of 6")).toBeDefined();
  });

  it("says a pair is unplanned when the day holds nothing", async () => {
    show([
      pair({
        date: "2026-09-23T00:00:00.000Z",
        current: null,
        progress: { done: 0, total: 0 },
        week: { done: 0, total: 0 },
      }),
    ]);

    expect(await screen.findByText("Not planned")).toBeDefined();
  });
});
