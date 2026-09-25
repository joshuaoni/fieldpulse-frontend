import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityScreen } from "./activity-screen";
import type { ActivityEvent, ActivityPage } from "../types";

const fetchActivity = vi.fn();

vi.mock("../api", () => ({ fetchActivity: (...args: unknown[]) => fetchActivity(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const event = (overrides: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id: "event-1",
  action: "VISIT_REPORT_SUBMITTED",
  entityType: "Visit",
  entityId: "visit-1",
  subject: "TechHub Solutions",
  actor: { id: "u1", firstName: "Amarachi", lastName: "Samuel" },
  comments: null,
  occurredAt: new Date().toISOString(),
  ...overrides,
});

const page = (overrides: Partial<ActivityPage> = {}): ActivityPage => ({
  events: [event()],
  actions: ["VISIT_REPORT_SUBMITTED", "LEAD_CREATED"],
  pagination: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
  ...overrides,
});

beforeEach(() => fetchActivity.mockResolvedValue(page()));

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ActivityScreen />
    </QueryClientProvider>,
  );
}

describe("what a row says", () => {
  it("reads as what happened, to what, by whom", async () => {
    show();

    expect(await screen.findByText("Report submitted")).toBeDefined();
    expect(screen.getByText("TechHub Solutions")).toBeDefined();
    expect(screen.getByText("Amarachi Samuel")).toBeDefined();
  });

  // Nobody pressed a button; saying "system" would be vaguer than the truth.
  it("names the scheduler when nobody acted", async () => {
    fetchActivity.mockResolvedValue(
      page({ events: [event({ actor: null, action: "VISITS_MARKED_MISSED" })] }),
    );
    show();

    expect(await screen.findByText("Scheduler")).toBeDefined();
  });

  /**
   * The audit row outlives what it describes. A deleted subject must leave the
   * row standing and say plainly why there is no name.
   */
  it("stands on its own once the subject is gone", async () => {
    fetchActivity.mockResolvedValue(page({ events: [event({ subject: null })] }));
    show();

    expect(await screen.findByText(/no longer exists/)).toBeDefined();
    expect(screen.getByText("Report submitted")).toBeDefined();
  });

  it("shows the note when one was left", async () => {
    fetchActivity.mockResolvedValue(
      page({ events: [event({ comments: "Rescheduled at the client's request." })] }),
    );
    show();

    expect(await screen.findByText(/Rescheduled at the client's request/)).toBeDefined();
  });

  /**
   * An action the code writes but this map has not caught up with should still
   * read as words rather than as a constant.
   */
  it("reads an unmapped action legibly rather than raw", async () => {
    fetchActivity.mockResolvedValue(page({ events: [event({ action: "SOMETHING_NEW_HAPPENED" })] }));
    show();

    expect(await screen.findByText("Something new happened")).toBeDefined();
  });
});

describe("narrowing the log", () => {
  const openFilters = async () => {
    show();
    await screen.findByText("Report submitted");
    fireEvent.click(screen.getByText("Filter"));
  };

  const chip = (name: string) => within(screen.getByRole("dialog")).getByText(name);

  it("offers only the actions the log actually holds", async () => {
    await openFilters();
    await screen.findByRole("dialog");

    expect(chip("Lead created")).toBeDefined();
    expect(within(screen.getByRole("dialog")).queryByText("Plan published")).toBeNull();
  });

  it("changes nothing until the filters are applied", async () => {
    await openFilters();
    await screen.findByRole("dialog");

    fireEvent.click(chip("Leads"));

    expect(fetchActivity).not.toHaveBeenCalledWith(
      expect.objectContaining({ entityTypes: ["Lead"] }),
      expect.anything(),
    );
  });

  it("applies an area filter", async () => {
    await openFilters();
    await screen.findByRole("dialog");

    fireEvent.click(chip("Leads"));
    fireEvent.click(chip("Apply filters"));

    await waitFor(() =>
      expect(fetchActivity).toHaveBeenCalledWith(
        expect.objectContaining({ entityTypes: ["Lead"] }),
        expect.anything(),
      ),
    );
  });

  it("shows what is applied and drops one on request", async () => {
    await openFilters();
    await screen.findByRole("dialog");
    fireEvent.click(chip("Leads"));
    fireEvent.click(chip("Apply filters"));

    fireEvent.click(await screen.findByLabelText("Remove Leads filter"));

    await waitFor(() => expect(screen.queryByLabelText("Remove Leads filter")).toBeNull());
  });

  it("searches the log", async () => {
    show();
    await screen.findByText("Report submitted");

    fireEvent.change(screen.getByLabelText("Search the activity log"), {
      target: { value: "amarachi" },
    });

    await waitFor(() =>
      expect(fetchActivity).toHaveBeenCalledWith(
        expect.objectContaining({ search: "amarachi" }),
        expect.anything(),
      ),
    );
  });
});

/**
 * A feed is read downwards, so more rows are added to what is already there
 * rather than replacing it a page at a time.
 */
describe("reading further back", () => {
  it("widens the window rather than stepping through pages", async () => {
    fetchActivity.mockResolvedValue(
      page({ pagination: { page: 1, pageSize: 50, totalItems: 120, totalPages: 3 } }),
    );
    show();

    fireEvent.click(await screen.findByText(/Load more/));

    await waitFor(() => expect(fetchActivity).toHaveBeenCalledWith(expect.anything(), 100));
  });

  it("offers nothing more to load once everything is shown", async () => {
    show();

    await screen.findByText("Report submitted");
    expect(screen.queryByText(/Load more/)).toBeNull();
  });
});
