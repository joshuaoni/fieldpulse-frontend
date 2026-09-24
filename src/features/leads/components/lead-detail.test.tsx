import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadDetail } from "./lead-detail";
import type { Lead, LeadEngagement } from "../types";

const fetchLeadEngagement = vi.fn();

vi.mock("../api", () => ({
  fetchLeadEngagement: () => fetchLeadEngagement(),
  syncChatwoot: vi.fn(),
  fetchLeadEngagementByChatwootContact: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const PAIR = {
  id: "pair-1",
  name: null,
  members: [
    { user: { id: "u1", firstName: "Tunde", lastName: "Bello" } },
    { user: { id: "u2", firstName: "Zainab", lastName: "Ade" } },
  ],
};

const lead: Lead = {
  id: "lead-1",
  companyName: "Bright Field Ltd",
  phone: null,
  email: null,
  website: null,
  address: "Ikoyi, Lagos Nigeria",
  lat: null,
  lng: null,
  sector: null,
  chatwootContactId: null,
  lastEnrichedAt: null,
  isActive: true,
  createdAt: "2026-09-20T00:00:00.000Z",
  fieldSources: [
    { fieldName: "phone", source: "SPREADSHEET_SEED", fetchedAt: "2026-09-20T00:00:00.000Z" },
  ],
  lastVisit: null,
  isNew: false,
};

function show(engagement: Partial<LeadEngagement> = {}) {
  fetchLeadEngagement.mockResolvedValue({
    leadId: "lead-1",
    chatwootContactId: null,
    chatwootContactUrl: null,
    visits: [],
    ...engagement,
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LeadDetail lead={lead} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe("a lead's visit history", () => {
  /**
   * The point of opening a lead: reading what the call produced. It used to
   * say only that a write-up existed, which is the one thing a manager can
   * already see from the list.
   */
  it("shows the write-up itself, and who called", async () => {
    show({
      visits: [
        {
          id: "v1",
          scheduledFor: "2026-09-23T00:00:00.000Z",
          status: "COMPLETED",
          outcome: "CLOSED",
          submittedAt: "2026-09-23T15:40:00.000Z",
          notes: "Very keen on the new packaging line. Wants a formal quote by Friday.",
          pair: PAIR,
        },
      ],
    });

    expect(await screen.findByText(/Very keen on the new packaging line/)).toBeDefined();
    expect(screen.getByText("Tunde & Zainab")).toBeDefined();
    expect(screen.getByText("Closed")).toBeDefined();
  });

  it("says when a call has been made but not written up", async () => {
    show({
      visits: [
        {
          id: "v1",
          scheduledFor: "2026-09-23T00:00:00.000Z",
          status: "COMPLETED",
          outcome: null,
          submittedAt: null,
          notes: null,
          pair: PAIR,
        },
      ],
    });

    expect(await screen.findByText(/Nobody has written this visit up/)).toBeDefined();
  });

  it("says a booking has not been called on yet", async () => {
    show({
      visits: [
        {
          id: "v1",
          scheduledFor: "2026-09-25T00:00:00.000Z",
          status: "PLANNED",
          outcome: null,
          submittedAt: null,
          notes: null,
          pair: PAIR,
        },
      ],
    });

    expect(await screen.findByText(/Booked, not yet called on/)).toBeDefined();
    expect(screen.getByText("Sep 25, 2026")).toBeDefined();
  });

  it("offers the Chatwoot link once a contact exists", async () => {
    show({
      chatwootContactId: "42",
      chatwootContactUrl: "https://app.chatwoot.com/app/accounts/1/contacts/42",
    });

    const link = await screen.findByText("View in Chatwoot");
    expect(link.closest("a")?.getAttribute("href")).toBe(
      "https://app.chatwoot.com/app/accounts/1/contacts/42",
    );
  });

  it("explains the absence rather than offering a broken link", async () => {
    show();

    expect(await screen.findByText(/No Chatwoot contact yet/)).toBeDefined();
  });
});
