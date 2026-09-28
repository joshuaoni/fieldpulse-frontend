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
  useSession: () => ({ status: sessionState.status, refresh: vi.fn() }),
}));

// The sign-in form reaches for the router it would navigate with everywhere
// but here, where the panel gives it somewhere else to go instead.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/features/auth/api", () => ({ login: vi.fn() }));

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
      outcome: "INTERESTED",
      submittedAt: null,
      notes: null,
      pair: {
        id: "pair-1",
        name: null,
        members: [{ user: { id: "u1", firstName: "Tunde", lastName: "Bello" } }],
      },
    },
  ],
};

describe("ChatwootDashboardAppScreen", () => {
  /**
   * The panel signs the viewer in itself. A browser keeps a third-party
   * frame's storage apart from the same site's own tab, so a session started
   * in a FieldPulse tab is not one this frame can see — the old advice to
   * sign in elsewhere and come back could never have worked.
   */
  it("offers to sign in here when there is no session in this frame", () => {
    sessionState.status = "anonymous";

    renderScreen();

    expect(screen.getByText("Sign in to FieldPulse")).toBeTruthy();
    expect(screen.getByLabelText("Work email")).toBeTruthy();
  });

  // A 401 clears the stored token, so asking before the session is known
  // would sign the viewer out every time the panel loaded.
  it("asks the server for nothing until it knows who is looking", () => {
    sessionState.status = "anonymous";

    renderScreen();
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://app.chatwoot.com",
        data: JSON.stringify({ event: "appContext", data: { contact: { id: 42 } } }),
      }),
    );

    expect(fetchLeadEngagementByChatwootContact).not.toHaveBeenCalled();
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

    expect(await screen.findByText("Interested")).toBeTruthy();
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
