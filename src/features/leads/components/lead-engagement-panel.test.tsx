import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import { LeadEngagementPanel } from "./lead-engagement-panel";
import type { LeadEngagement } from "../types";

const fetchLeadEngagement = vi.fn();
const syncChatwoot = vi.fn();

vi.mock("../api", () => ({
  fetchLeadEngagement: (...args: unknown[]) => fetchLeadEngagement(...args),
  syncChatwoot: (...args: unknown[]) => syncChatwoot(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPanel(leadId = "lead-1") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LeadEngagementPanel leadId={leadId} />
    </QueryClientProvider>,
  );
}

const linked: LeadEngagement = {
  leadId: "lead-1",
  chatwootContactId: "42",
  chatwootContactUrl: "https://app.chatwoot.com/app/accounts/1/contacts/42",
  visits: [
    {
      id: "v1",
      scheduledFor: "2026-09-20T08:00:00.000Z",
      status: "COMPLETED",
      outcome: "interested",
      submittedAt: null,
    },
  ],
};

const unlinked: LeadEngagement = {
  leadId: "lead-1",
  chatwootContactId: null,
  chatwootContactUrl: null,
  visits: [],
};

describe("LeadEngagementPanel", () => {
  it("shows a View in Chatwoot link and visit history once linked", async () => {
    fetchLeadEngagement.mockResolvedValue(linked);

    renderPanel();

    const link = await screen.findByRole("link", { name: "View in Chatwoot" });
    expect(link.getAttribute("href")).toBe(linked.chatwootContactUrl);
    expect(screen.getByText("interested")).toBeTruthy();
  });

  it("offers a Link to Chatwoot button when there is no contact yet", async () => {
    fetchLeadEngagement.mockResolvedValue(unlinked);

    renderPanel();

    expect(await screen.findByRole("button", { name: "Link to Chatwoot" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "View in Chatwoot" })).toBeNull();
  });

  it("shows a friendly message for a lead with no phone or email", async () => {
    fetchLeadEngagement.mockResolvedValue(unlinked);
    syncChatwoot.mockRejectedValue(new ApiError(422, "refused", "LEAD_HAS_NO_CONTACT_METHOD"));

    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Link to Chatwoot" }));

    await waitFor(() =>
      expect(
        screen.getByText("This lead has no phone or email to match a Chatwoot contact."),
      ).toBeTruthy(),
    );
  });

  it("shows the raw error message for anything else", async () => {
    fetchLeadEngagement.mockResolvedValue(unlinked);
    syncChatwoot.mockRejectedValue(new Error("network fell over"));

    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Link to Chatwoot" }));

    await waitFor(() => expect(screen.getByText("network fell over")).toBeTruthy());
  });
});
