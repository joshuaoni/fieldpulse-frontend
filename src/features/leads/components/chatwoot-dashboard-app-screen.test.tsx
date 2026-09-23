import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import { ChatwootDashboardAppScreen } from "./chatwoot-dashboard-app-screen";
import type { LeadEngagement } from "../types";

const fetchLeadEngagementByChatwootContact = vi.fn();

vi.mock("../api", () => ({
  fetchLeadEngagementByChatwootContact: (...args: unknown[]) =>
    fetchLeadEngagementByChatwootContact(...args),
}));

const CHATWOOT_ORIGIN = "https://app.chatwoot.com";

vi.mock("@/lib/config", () => ({
  config: { chatwootOrigin: "https://app.chatwoot.com" },
}));

const sessionState = { status: "authenticated" as "loading" | "authenticated" | "anonymous" };
vi.mock("@/lib/session", () => ({
  useSession: () => ({ status: sessionState.status }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sessionState.status = "authenticated";
});

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ChatwootDashboardAppScreen />
    </QueryClientProvider>,
  );
}

/** Simulates Chatwoot's documented reply: a JSON *string*, not an object. */
function postAppContext(contactId: number | string, origin = CHATWOOT_ORIGIN) {
  const data = JSON.stringify({ event: "appContext", data: { contact: { id: contactId } } });
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data, origin }));
  });
}

const engagement: LeadEngagement = {
  leadId: "lead-1",
  chatwootContactId: "42",
  chatwootContactUrl: `${CHATWOOT_ORIGIN}/app/accounts/1/contacts/42`,
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

describe("ChatwootDashboardAppScreen", () => {
  it("prompts sign-in when there is no FieldPulse session", () => {
    sessionState.status = "anonymous";

    renderScreen();

    expect(screen.getByText(/Sign in to FieldPulse in another browser tab/)).toBeTruthy();
  });

  it("waits for Chatwoot before fetching anything", () => {
    renderScreen();

    expect(screen.getByText("Waiting for Chatwoot…")).toBeTruthy();
    expect(fetchLeadEngagementByChatwootContact).not.toHaveBeenCalled();
  });

  // The documented protocol sends a JSON string, not an object — a plain
  // object payload would previously have been silently ignored.
  it("ignores a message from any origin other than Chatwoot's", () => {
    renderScreen();

    postAppContext(42, "https://evil.example.com");

    expect(screen.getByText("Waiting for Chatwoot…")).toBeTruthy();
    expect(fetchLeadEngagementByChatwootContact).not.toHaveBeenCalled();
  });

  it("resolves the contact id from Chatwoot's appContext message and shows visit history", async () => {
    fetchLeadEngagementByChatwootContact.mockResolvedValue(engagement);

    renderScreen();
    postAppContext(42);

    expect(await screen.findByText("interested")).toBeTruthy();
    expect(fetchLeadEngagementByChatwootContact).toHaveBeenCalledWith("42");
  });

  it("tells the agent plainly when no lead is linked to this contact", async () => {
    fetchLeadEngagementByChatwootContact.mockRejectedValue(new ApiError(404, "not found"));

    renderScreen();
    postAppContext(99);

    expect(
      await screen.findByText("No FieldPulse lead is linked to this contact yet."),
    ).toBeTruthy();
  });
});
