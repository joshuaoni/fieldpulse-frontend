"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/errors";
import { useSession } from "@/lib/session";
import { useLeadEngagementByChatwootContact } from "../hooks";

interface ChatwootAppContext {
  contact?: { id?: number | string };
}

/**
 * Requests and parses context from Chatwoot, per Chatwoot's documented
 * Dashboard App protocol (chatwoot.com/docs/user-guide/integrations):
 *
 *  - Request:  window.parent.postMessage('chatwoot-dashboard-app:fetch-info', '*')
 *              — a plain string, not an object.
 *  - Response: a `message` event whose `event.data` is a JSON *string*
 *              (parse it) shaped { event: "appContext", data: { contact,
 *              conversation, currentAgent } }.
 */
function useChatwootContactId(): string | null {
  const [contactId, setContactId] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // Chatwoot Cloud (or a self-hosted instance set via
      // NEXT_PUBLIC_CHATWOOT_ORIGIN) is the only origin this page trusts.
      if (event.origin !== config.chatwootOrigin) return;
      if (typeof event.data !== "string") return;

      let parsed: { event?: string; data?: ChatwootAppContext };
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }

      if (parsed.event !== "appContext") return;
      const id = parsed.data?.contact?.id;
      if (id !== undefined && id !== null) setContactId(String(id));
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage("chatwoot-dashboard-app:fetch-info", "*");

    return () => window.removeEventListener("message", onMessage);
  }, []);

  return contactId;
}

function SignInPrompt() {
  return (
    <div className="p-4 text-sm text-muted">
      <p>Sign in to FieldPulse in another browser tab, then come back and refresh this tab.</p>
      <a
        href="/login"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-brand underline"
      >
        Open FieldPulse
      </a>
    </div>
  );
}

const stamp = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

/**
 * Conversation-side view of the same lead's FieldPulse visit history.
 */
export function ChatwootDashboardAppScreen() {
  const { status } = useSession();
  const contactId = useChatwootContactId();
  const {
    data: engagement,
    isPending,
    isError,
    error,
  } = useLeadEngagementByChatwootContact(contactId);

  if (status === "loading") return <p className="p-4 text-sm text-muted">Loading…</p>;
  if (status === "anonymous") return <SignInPrompt />;

  if (!contactId) {
    return <p className="p-4 text-sm text-muted">Waiting for Chatwoot…</p>;
  }

  if (isPending) return <p className="p-4 text-sm text-muted">Loading…</p>;

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <p role="alert" className="p-4 text-sm text-muted">
        {notFound
          ? "No FieldPulse lead is linked to this contact yet."
          : error instanceof Error
            ? error.message
            : "Could not load this lead's FieldPulse history"}
      </p>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-sm font-medium">FieldPulse visit history</h1>

      {engagement.visits.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No visits recorded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-t border-border text-sm">
          {engagement.visits.map((visit) => (
            <li key={visit.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-muted">{stamp(visit.scheduledFor)}</span>
              <span className="truncate text-right">{visit.outcome ?? visit.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
