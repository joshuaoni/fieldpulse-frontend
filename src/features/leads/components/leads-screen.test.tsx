import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LeadsScreen } from "./leads-screen";
import type { Lead, LeadPage, SearchTarget } from "../types";

const fetchLeads = vi.fn();
const fetchSearchTargets = vi.fn();
const runSearchTarget = vi.fn();
const runEnrichment = vi.fn();
const previewEnrichment = vi.fn();
const collectDiscovery = vi.fn();

vi.mock("../api", () => ({
  fetchLeads: (...args: unknown[]) => fetchLeads(...args),
  fetchSearchTargets: () => fetchSearchTargets(),
  runSearchTarget: (...args: unknown[]) => runSearchTarget(...args),
  runEnrichment: () => runEnrichment(),
  previewEnrichment: () => previewEnrichment(),
  collectDiscovery: () => collectDiscovery(),
  createSearchTarget: vi.fn(),
  setSearchTargetActive: vi.fn(),
  fetchLeadEngagement: vi.fn().mockResolvedValue({
    leadId: "lead-1",
    chatwootContactId: null,
    chatwootContactUrl: null,
    visits: [],
  }),
  fetchLeadEngagementByChatwootContact: vi.fn(),
  syncChatwoot: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const lead = (overrides: Partial<Lead> = {}): Lead => ({
  id: "lead-1",
  companyName: "Bright Field Ltd",
  phone: null,
  email: null,
  website: null,
  address: "Ikoyi, Lagos Nigeria",
  lat: 6.6,
  lng: 3.35,
  sector: null,
  chatwootContactId: null,
  lastEnrichedAt: null,
  isActive: true,
  createdAt: "2026-09-24T06:02:00.000Z",
  fieldSources: [
    { fieldName: "phone", source: "SPREADSHEET_SEED", fetchedAt: "2026-09-20T00:00:00.000Z" },
    { fieldName: "email", source: "APOLLO", fetchedAt: "2026-09-21T00:00:00.000Z" },
    { fieldName: "website", source: "APOLLO", fetchedAt: "2026-09-21T00:00:00.000Z" },
  ],
  lastVisit: {
    visitId: "visit-1",
    visitedAt: "2026-09-23T13:15:00.000Z",
    scheduledFor: "2026-09-23T00:00:00.000Z",
    state: "INTERESTED",
    flagged: false,
  },
  isNew: false,
  ...overrides,
});

const page = (overrides: Partial<LeadPage> = {}): LeadPage => ({
  leads: [lead()],
  discovery: {
    startedAt: "2026-09-24T06:00:00.000Z",
    at: new Date(Date.now() - 6 * 3600_000).toISOString(),
    newLeads: 12,
  },
  pagination: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
  ...overrides,
});

const target = (overrides: Partial<SearchTarget> = {}): SearchTarget => ({
  id: "target-1",
  query: "hardware stores",
  area: "Ikoyi, Lagos",
  sector: null,
  isActive: true,
  lastRunAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  lastRunStartedAt: new Date(Date.now() - 2.1 * 3600_000).toISOString(),
  lastRunNewLeads: 12,
  lastRunError: null,
  lastRunCapped: false,
  apifyRunId: null,
  apifyRunStartedAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  previewEnrichment.mockResolvedValue({ candidates: 14, configured: true });
});

function show(leadPage = page(), targets: SearchTarget[] = [target()]) {
  fetchLeads.mockResolvedValue(leadPage);
  fetchSearchTargets.mockResolvedValue({ searchTargets: targets, maxResultsPerTarget: 30 });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LeadsScreen />
    </QueryClientProvider>,
  );
}

describe("the leads table", () => {
  it("says when the pipeline last ran and what it brought in", async () => {
    show();

    expect(await screen.findByText(/Last run 6 hours ago · 12 new leads since/)).toBeDefined();
  });

  // The providers are per field on the record; the row wants the distinct set.
  it("shows each provider that touched the lead once", async () => {
    show();

    await screen.findByText("Bright Field Ltd");
    expect(screen.getAllByText("Apollo")).toHaveLength(1);
    expect(screen.getByText("Spreadsheet")).toBeDefined();
  });

  it("marks leads that arrived in the last run", async () => {
    show(page({ leads: [lead({ isNew: true })] }));

    expect(await screen.findByText("New")).toBeDefined();
  });

  it("narrows to the new arrivals when the filter is pressed", async () => {
    show();

    fireEvent.click(await screen.findByText(/New from the last run \(12\)/));

    await waitFor(() =>
      expect(fetchLeads).toHaveBeenCalledWith(expect.objectContaining({ onlyNew: true })),
    );
  });

  it("searches on the lead rather than the pair", async () => {
    show();

    await screen.findByText("Bright Field Ltd");
    fireEvent.change(screen.getByLabelText("Search by lead"), {
      target: { value: "bright" },
    });

    await waitFor(() =>
      expect(fetchLeads).toHaveBeenCalledWith(expect.objectContaining({ search: "bright" })),
    );
  });

  it("says plainly when a lead has never been visited", async () => {
    show(page({ leads: [lead({ lastVisit: null })] }));

    expect(await screen.findByText("Never visited")).toBeDefined();
  });

  /**
   * A booked day is held at midnight UTC. Read with a clock in a zone ahead
   * of it, it came out as 1am on leads nobody had been to — a time nobody
   * recorded, on a visit that had not happened.
   */
  it("shows a booking as a day, with no invented time", async () => {
    show(
      page({
        leads: [
          lead({
            lastVisit: {
              visitId: "v",
              visitedAt: null,
              scheduledFor: "2026-09-25T00:00:00.000Z",
              state: "PLANNED",
              flagged: false,
            },
          }),
        ],
      }),
    );

    expect(await screen.findByText("Booked for Sep 25")).toBeDefined();
    expect(screen.queryByText(/1:00/)).toBeNull();
  });

  it("shows a real arrival with its time", async () => {
    show();

    expect(await screen.findByText(/Sep 23/)).toBeDefined();
  });
});

/**
 * The column blends two things on purpose, but an outcome always wins. A
 * flagged check-in behind a written-up visit is still worth saying, just not
 * at the cost of hiding the outcome.
 */
describe("where the last visit got to", () => {
  it("shows the written-up outcome", async () => {
    show();

    expect(await screen.findByText("Interested")).toBeDefined();
  });

  it("shows Flagged when nobody wrote it up", async () => {
    show(
      page({
        leads: [
          lead({
            lastVisit: {
              visitId: "v",
              visitedAt: null,
              scheduledFor: null,
              state: "FLAGGED",
              flagged: true,
            },
          }),
        ],
      }),
    );

    expect(await screen.findByText("Flagged")).toBeDefined();
  });

  it("keeps the outcome but still notes the query when both apply", async () => {
    show(
      page({
        leads: [
          lead({
            lastVisit: {
              visitId: "v",
              visitedAt: null,
              scheduledFor: null,
              state: "INTERESTED",
              flagged: true,
            },
          }),
        ],
      }),
    );

    expect(await screen.findByText("Interested")).toBeDefined();
    expect(screen.getByText("Check-in location queried")).toBeDefined();
  });

  it("shows a visit still running", async () => {
    show(
      page({
        leads: [
          lead({
            lastVisit: {
              visitId: "v",
              visitedAt: null,
              scheduledFor: null,
              state: "IN_PROGRESS",
              flagged: false,
            },
          }),
        ],
      }),
    );

    expect(await screen.findByText("In progress")).toBeDefined();
  });
});

describe("the search targets tab", () => {
  it("is reachable from the leads tab", async () => {
    show();

    fireEvent.click(await screen.findByText("Search targets"));

    expect(await screen.findByText("hardware stores")).toBeDefined();
    expect(screen.getByText("Ikoyi, Lagos")).toBeDefined();
  });

  it("says what the last run yielded", async () => {
    show();
    fireEvent.click(await screen.findByText("Search targets"));

    expect(await screen.findByText("12 new leads")).toBeDefined();
  });

  it("runs one target by hand", async () => {
    runSearchTarget.mockResolvedValue({ targetId: "target-1", runId: "run-1" });
    show();
    fireEvent.click(await screen.findByText("Search targets"));

    fireEvent.click(await screen.findByText("Run now"));
    fireEvent.click(await screen.findByText("Run search"));

    await waitFor(() => expect(runSearchTarget).toHaveBeenCalled());
    expect(runSearchTarget.mock.calls[0][0]).toBe("target-1");
  });

  // A scrape already in flight must not be started twice.
  it("will not start a target that is already running", async () => {
    show(page(), [target({ apifyRunId: "run-1", apifyRunStartedAt: new Date().toISOString() })]);
    fireEvent.click(await screen.findByText("Search targets"));

    expect(await screen.findByText(/Running/)).toBeDefined();
    expect(screen.getByText("Run now").closest("button")).toHaveProperty("disabled", true);
  });

  /**
   * A capped run is the one case where re-running as-is buys nothing: the area
   * holds more than the cap took, so the row has to say what to do instead.
   */
  it("explains a run that hit its cap", async () => {
    show(page(), [target({ lastRunCapped: true })]);
    fireEvent.click(await screen.findByText("Search targets"));

    expect(await screen.findByText(/Hit its result cap/)).toBeDefined();
  });

  it("surfaces a failed run rather than showing a yield of nothing", async () => {
    show(page(), [target({ lastRunError: "The scrape did not finish successfully" })]);
    fireEvent.click(await screen.findByText("Search targets"));

    expect(await screen.findByText("The scrape did not finish successfully")).toBeDefined();
  });
});

/**
 * Both of these spend real money — Apollo per lookup, Apify per scrape — so
 * neither may fire from a single click, and the dialog has to say what is
 * about to be bought rather than only asking whether you are sure.
 */
/** The dialog's own confirm, not the header button that opened it. */
const confirmButton = () =>
  within(screen.getByRole("dialog")).getByRole("button", { name: "Run enrichment" });

describe("before anything is paid for", () => {
  it("does not enrich until it is confirmed", async () => {
    show();

    fireEvent.click(await screen.findByText("Run enrichment"));

    expect(runEnrichment).not.toHaveBeenCalled();
    expect(await screen.findByText("Run enrichment?")).toBeDefined();
  });

  it("says how many lookups the run would make", async () => {
    show();
    fireEvent.click(await screen.findByText("Run enrichment"));

    expect(await screen.findByText(/14 leads/)).toBeDefined();
    expect(screen.getByRole("dialog").textContent).toContain("Each lookup is billed");
  });

  it("enriches once confirmed", async () => {
    runEnrichment.mockResolvedValue({ considered: 14, created: 0, updated: 3 });
    show();

    fireEvent.click(await screen.findByText("Run enrichment"));
    await screen.findByText(/14 leads/);
    fireEvent.click(confirmButton());

    await waitFor(() => expect(runEnrichment).toHaveBeenCalled());
  });

  it("abandons the run on cancel", async () => {
    show();

    fireEvent.click(await screen.findByText("Run enrichment"));
    fireEvent.click(await screen.findByText("Cancel"));

    await waitFor(() => expect(screen.queryByText("Run enrichment?")).toBeNull());
    expect(runEnrichment).not.toHaveBeenCalled();
  });

  // Paying to look up nothing is the one case worth refusing outright.
  it("refuses a run with nothing waiting", async () => {
    previewEnrichment.mockResolvedValue({ candidates: 0, configured: true });
    show();

    fireEvent.click(await screen.findByText("Run enrichment"));

    expect(await screen.findByText(/Nothing is waiting to be enriched/)).toBeDefined();
    expect(confirmButton()).toHaveProperty("disabled", true);
  });

  it("says when the run would be capped, and that more are waiting", async () => {
    previewEnrichment.mockResolvedValue({ candidates: 50, cappedAt: 50, configured: true });
    show();

    fireEvent.click(await screen.findByText("Run enrichment"));

    expect(await screen.findByText(/more are waiting behind it/)).toBeDefined();
  });

  it("refuses a run when Apollo is not configured", async () => {
    previewEnrichment.mockResolvedValue({ candidates: 14, configured: false });
    show();

    fireEvent.click(await screen.findByText("Run enrichment"));

    expect(await screen.findByText(/no credentials configured/)).toBeDefined();
    expect(confirmButton()).toHaveProperty("disabled", true);
  });

  it("does not scrape until it is confirmed, and says what it buys", async () => {
    show();
    fireEvent.click(await screen.findByText("Search targets"));
    fireEvent.click(await screen.findByText("Run now"));

    expect(runSearchTarget).not.toHaveBeenCalled();
    expect(await screen.findByText(/up to 30 results/)).toBeDefined();
  });

  /**
   * A capped run buys the same list twice. That is worth saying at the moment
   * of spending, not only on the row behind the dialog.
   */
  it("warns that re-running a capped target buys the same list", async () => {
    show(page(), [target({ lastRunCapped: true })]);
    fireEvent.click(await screen.findByText("Search targets"));
    fireEvent.click(await screen.findByText("Run now"));

    expect(await screen.findByText(/much the same list again/)).toBeDefined();
  });

  it("warns that a target which found nothing is likely spent", async () => {
    show(page(), [target({ lastRunNewLeads: 0 })]);
    fireEvent.click(await screen.findByText("Search targets"));
    fireEvent.click(await screen.findByText("Run now"));

    expect(await screen.findByText(/given everything Maps lists/)).toBeDefined();
  });
});

/**
 * Starting a scrape and folding its results in are separate steps. If nothing
 * does the second, a row reads "running" for ever — which is exactly what
 * happened on a machine where the collecting cron does not run.
 */
describe("seeing a running scrape through", () => {
  const RUNNING = target({ apifyRunId: "run-1", apifyRunStartedAt: new Date().toISOString() });

  it("collects while a scrape is in flight", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    collectDiscovery.mockResolvedValue({ waitingOn: "target-1" });
    show(page(), [RUNNING]);

    fireEvent.click(await screen.findByText("Search targets"));
    await screen.findByText(/Running/);

    await vi.advanceTimersByTimeAsync(9_000);

    expect(collectDiscovery).toHaveBeenCalled();
    vi.useRealTimers();
  });

  /**
   * The collect-only step, never the full tick: that one starts the next
   * target, which would buy a scrape nobody asked for — from a timer.
   */
  it("never starts a scrape from the timer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    collectDiscovery.mockResolvedValue({ waitingOn: "target-1" });
    show(page(), [RUNNING]);

    fireEvent.click(await screen.findByText("Search targets"));
    await screen.findByText(/Running/);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(runSearchTarget).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("leaves it alone when nothing is running", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    show();

    fireEvent.click(await screen.findByText("Search targets"));
    await screen.findByText("hardware stores");
    await vi.advanceTimersByTimeAsync(30_000);

    expect(collectDiscovery).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("stops and says so when collecting cannot work", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    collectDiscovery.mockRejectedValue(new Error("Apify is not configured"));
    show(page(), [RUNNING]);

    fireEvent.click(await screen.findByText("Search targets"));
    await screen.findByText(/Running/);
    await vi.advanceTimersByTimeAsync(9_000);

    expect(await screen.findByText(/Apify is not configured/)).toBeDefined();

    const afterFailure = collectDiscovery.mock.calls.length;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(collectDiscovery.mock.calls.length).toBe(afterFailure);

    vi.useRealTimers();
  });
});
