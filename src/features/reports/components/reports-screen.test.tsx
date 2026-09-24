import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsScreen } from "./reports-screen";
import type { FieldReport, ReportPage, TeamOverview } from "../types";

const fetchTeamOverview = vi.fn();
const fetchReports = vi.fn();
const exportReports = vi.fn();

vi.mock("../api", () => ({
  fetchTeamOverview: (...args: unknown[]) => fetchTeamOverview(...args),
  fetchReports: (...args: unknown[]) => fetchReports(...args),
  exportReports: (...args: unknown[]) => exportReports(...args),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const metric = (value: number, previous: number | null = null) => ({ value, previous });

const overview: TeamOverview = {
  totalVisits: metric(142, 120),
  planAdherence: metric(89, 89),
  conversionRate: metric(34, 30),
  averageDwellMinutes: metric(28, 35),
};

const report = (overrides: Partial<FieldReport> = {}): FieldReport => ({
  id: "report-1",
  visitId: "visit-1",
  notes: "Very keen on the new packaging line. Wants a formal quote by Friday.",
  outcome: "INTERESTED",
  submittedAt: "2026-09-11T15:40:00.000Z",
  lead: { id: "lead-1", companyName: "TechHub Solutions", sector: "Retail" },
  pair: {
    id: "pair-1",
    name: null,
    members: [
      {
        user: {
          id: "u1",
          firstName: "Tunde",
          lastName: "Bello",
          profileImageUrl: "https://cdn.test/tunde.jpg",
        },
      },
      { user: { id: "u2", firstName: "Zainab", lastName: "Ade", profileImageUrl: null } },
    ],
  },
  flagged: false,
  ...overrides,
});

const page = (overrides: Partial<ReportPage> = {}): ReportPage => ({
  reports: [report()],
  sectors: ["Manufacturing", "Retail", "Logistics"],
  pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  ...overrides,
});

beforeEach(() => {
  fetchTeamOverview.mockResolvedValue(overview);
  fetchReports.mockResolvedValue(page());
});

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReportsScreen />
    </QueryClientProvider>,
  );
}

describe("the team's numbers", () => {
  it("shows each measure in the unit it is read in", async () => {
    show();

    expect(await screen.findByText("142")).toBeDefined();
    expect(screen.getByText("89%")).toBeDefined();
    expect(screen.getByText("34%")).toBeDefined();
    expect(screen.getByText("28min")).toBeDefined();
  });

  /**
   * The arrow is a comparison, so it may only appear when there is something
   * to compare against. A first period has no trend, and drawing one would be
   * inventing it.
   */
  it("draws no trend when there is no period behind this one", async () => {
    fetchTeamOverview.mockResolvedValue({ ...overview, totalVisits: metric(142, null) });
    show();

    await screen.findByText("142");
    expect(screen.queryByTitle(/from 120/)).toBeNull();
  });

  it("says which way a measure moved", async () => {
    show();

    expect(await screen.findByTitle(/Up from 120/)).toBeDefined();
    expect(screen.getByTitle(/Down from 35min/)).toBeDefined();
  });

  // Unchanged is not a direction.
  it("draws no arrow when a measure held steady", async () => {
    show();

    await screen.findByText("89%");
    expect(screen.queryByTitle(/from 89%/)).toBeNull();
  });
});

describe("the field reports", () => {
  it("shows the write-up, the pair and the outcome", async () => {
    show();

    expect(await screen.findByText("TechHub Solutions")).toBeDefined();
    expect(screen.getByText(/Very keen on the new packaging line/)).toBeDefined();
    expect(screen.getByText("Tunde & Zainab")).toBeDefined();
    expect(screen.getByText("Interested")).toBeDefined();
  });

  /**
   * The pair is read by their faces as much as their names, the same way the
   * roster reads them. Anyone without a photo keeps the row's shape with
   * their initials rather than leaving a hole in it.
   */
  it("shows the pair's faces, falling back to initials", async () => {
    show();

    expect(await screen.findByTitle("Tunde Bello")).toBeDefined();
    expect(screen.getByTitle("Zainab Ade").textContent).toBe("ZA");
  });

  it("marks a report whose check-in did not line up", async () => {
    fetchReports.mockResolvedValue(page({ reports: [report({ flagged: true })] }));
    show();

    expect(await screen.findByText("Check-in location queried")).toBeDefined();
  });

  it("searches the reports", async () => {
    show();
    await screen.findByText("TechHub Solutions");

    fireEvent.change(screen.getByLabelText("Search the reports"), {
      target: { value: "packaging" },
    });

    await waitFor(() =>
      expect(fetchReports).toHaveBeenCalledWith(
        expect.objectContaining({ search: "packaging" }),
        1,
      ),
    );
  });
});

/**
 * Chosen in one go and applied together: picking four chips should not send
 * four queries, and closing without applying should leave the screen alone.
 */
describe("filtering", () => {
  const openFilters = async () => {
    show();
    await screen.findByText("TechHub Solutions");
    fireEvent.click(screen.getByText("Filter"));
  };

  /** Outcome names appear on report rows too, so chips are read in the dialog. */
  const chip = (name: string) => within(screen.getByRole("dialog")).getByText(name);

  it("offers only the sectors that written-up leads actually have", async () => {
    await openFilters();

    await screen.findByRole("dialog");
    expect(chip("Manufacturing")).toBeDefined();
    expect(chip("Logistics")).toBeDefined();
  });

  it("changes nothing until the filters are applied", async () => {
    await openFilters();

    await screen.findByRole("dialog");
    fireEvent.click(chip("Not viable"));

    expect(fetchReports).not.toHaveBeenCalledWith(
      expect.objectContaining({ outcomes: ["NOT_VIABLE"] }),
      1,
    );
  });

  it("applies the chosen outcomes together", async () => {
    await openFilters();

    await screen.findByRole("dialog");
    fireEvent.click(chip("Interested"));
    fireEvent.click(chip("Closed"));
    fireEvent.click(chip("Apply filters"));

    await waitFor(() =>
      expect(fetchReports).toHaveBeenCalledWith(
        expect.objectContaining({ outcomes: ["INTERESTED", "CLOSED"] }),
        1,
      ),
    );
  });

  it("applies a date range", async () => {
    await openFilters();

    await screen.findByRole("dialog");
    fireEvent.click(chip("Today"));
    fireEvent.click(chip("Apply filters"));

    await waitFor(() =>
      expect(fetchReports).toHaveBeenCalledWith(
        expect.objectContaining({ range: "TODAY" }),
        1,
      ),
    );
  });

  it("shows what is applied, and drops one on request", async () => {
    await openFilters();
    await screen.findByRole("dialog");
    fireEvent.click(chip("Not viable"));
    fireEvent.click(chip("Apply filters"));

    expect(await screen.findByLabelText("Remove Not viable filter")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Remove Not viable filter"));

    await waitFor(() =>
      expect(screen.queryByLabelText("Remove Not viable filter")).toBeNull(),
    );
  });

  it("clears everything at once", async () => {
    await openFilters();
    await screen.findByRole("dialog");
    fireEvent.click(chip("Not viable"));
    fireEvent.click(chip("Apply filters"));

    fireEvent.click(await screen.findByText("Clear all"));

    await waitFor(() => expect(screen.queryByText("Clear all")).toBeNull());
  });
});

describe("exporting", () => {
  it("exports what is on screen, filters and all", async () => {
    exportReports.mockResolvedValue(new Blob(["a,b"], { type: "text/csv" }));
    show();
    await screen.findByText("TechHub Solutions");

    fireEvent.change(screen.getByLabelText("Search the reports"), {
      target: { value: "packaging" },
    });
    fireEvent.click(screen.getByText("Export report"));

    await waitFor(() =>
      expect(exportReports).toHaveBeenCalledWith(
        expect.objectContaining({ search: "packaging" }),
      ),
    );
  });

  // Nothing to export is not an error worth letting someone discover.
  it("will not export an empty list", async () => {
    fetchReports.mockResolvedValue(page({ reports: [] }));
    show();

    await screen.findByText(/No reports match/);
    expect(screen.getByText("Export report").closest("button")).toHaveProperty(
      "disabled",
      true,
    );
  });
});
