import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVisit, visitKeys } from "./hooks";
import type { Visit, VisitListResponse } from "./types";

const fetchVisit = vi.fn();

vi.mock("./api", () => ({
  fetchVisit: (...args: unknown[]) => fetchVisit(...args),
  fetchMyVisits: vi.fn(),
  fetchTeamVisits: vi.fn(),
  checkIn: vi.fn(),
  checkOut: vi.fn(),
  submitReport: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

const visit = {
  id: "visit-1",
  leadId: "lead-1",
  lead: { id: "lead-1", companyName: "Capital Partners", address: "VI, Lekki" },
  pairId: "pair-1",
  status: "PLANNED",
  attendances: [{ id: "att-1", repId: "me", checkInAt: null, checkOutAt: null }],
} as unknown as Visit;

const listHolding = (held: Visit): VisitListResponse =>
  ({ visits: [held], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } }) as
    VisitListResponse;

function withClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { client, wrapper };
}

/**
 * A rep opens their day, drives to a shop, and taps the visit in a basement
 * with no signal. The list they arrived with holds the whole record, so the
 * visit screen has no business being empty — they still have to check out.
 */
describe("opening a visit", () => {
  it("works from the day's list when the visit itself cannot be fetched", async () => {
    const { client, wrapper } = withClient();
    client.setQueryData(visitKeys.mine({}), listHolding(visit));
    fetchVisit.mockRejectedValue(new Error("Network request failed"));

    const { result } = renderHook(() => useVisit("visit-1"), { wrapper });

    expect(result.current.data?.lead.companyName).toBe("Capital Partners");
    await waitFor(() => expect(fetchVisit).toHaveBeenCalled());
    // The failed refresh does not take away what the rep already had.
    expect(result.current.data?.id).toBe("visit-1");
  });

  // Held only until the server answers: its copy is the one with the photo
  // URLs and the times it stamped itself.
  it("replaces it with the server's own copy as soon as one arrives", async () => {
    const { client, wrapper } = withClient();
    client.setQueryData(visitKeys.mine({}), listHolding(visit));
    fetchVisit.mockResolvedValue({ ...visit, status: "CHECKED_IN" });

    const { result } = renderHook(() => useVisit("visit-1"), { wrapper });

    await waitFor(() => expect(result.current.data?.status).toBe("CHECKED_IN"));
  });

  it("asks the server when no list holds it", async () => {
    const { wrapper } = withClient();
    fetchVisit.mockResolvedValue(visit);

    const { result } = renderHook(() => useVisit("visit-1"), { wrapper });

    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data?.id).toBe("visit-1"));
  });
});
