"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/errors";
import { outcomeLabel } from "@/lib/outcomes";
import { useLeadEngagement, useSyncChatwoot } from "../hooks";

const SYNC_ERROR_MESSAGE: Record<string, string> = {
  SOURCE_NOT_CONFIGURED: "Chatwoot is not configured on this deployment yet.",
  LEAD_HAS_NO_CONTACT_METHOD: "This lead has no phone or email to match a Chatwoot contact.",
};

function describeSyncError(error: unknown): string {
  if (error instanceof ApiError && error.code && SYNC_ERROR_MESSAGE[error.code]) {
    return SYNC_ERROR_MESSAGE[error.code];
  }
  return error instanceof Error ? error.message : "Could not sync to Chatwoot";
}

const stamp = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

export function LeadEngagementPanel({ leadId }: { leadId: string }) {
  const { data: engagement, isPending, isError, error } = useLeadEngagement(leadId);
  const sync = useSyncChatwoot(leadId);
  const [syncError, setSyncError] = useState<string | null>(null);

  if (isPending) return null;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error instanceof Error ? error.message : "Could not load Chatwoot engagement"}
      </p>
    );
  }

  const handleSync = () => {
    setSyncError(null);
    sync.mutate(undefined, {
      onError: (err) => setSyncError(describeSyncError(err)),
    });
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Chatwoot</h2>
        {engagement.chatwootContactUrl ? (
          <a
            href={engagement.chatwootContactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand underline"
          >
            View in Chatwoot
          </a>
        ) : (
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={sync.isPending}
            className="text-xs"
          >
            {sync.isPending ? "Linking…" : "Link to Chatwoot"}
          </Button>
        )}
      </header>

      {!engagement.chatwootContactUrl && !syncError && (
        <p className="mt-2 text-sm text-muted">
          Not linked yet — this happens automatically once a visit report is filed, or you can link
          it now.
        </p>
      )}

      {syncError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {syncError}
        </p>
      )}

      {engagement.visits.length > 0 && (
        <ul className="mt-3 divide-y divide-border border-t border-border text-sm">
          {engagement.visits.map((visit) => (
            <li key={visit.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-muted">{stamp(visit.scheduledFor)}</span>
              <span className="truncate text-right">{outcomeLabel(visit.outcome) ?? visit.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
