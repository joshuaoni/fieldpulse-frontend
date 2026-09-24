"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { pairLabel } from "@/lib/pairs";
import { useLeadEngagement, useSyncChatwoot } from "../hooks";
import { sourcesOf, type Lead } from "../types";
import { OutcomeBadge, SourceChips } from "./lead-badges";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

const bookedFor = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const engagement = useLeadEngagement(lead.id);

  return (
    <Modal
      onClose={onClose}
      label={lead.companyName}
      header={
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight">{lead.companyName}</h2>
          {lead.address && (
            <p className="mt-0.5 truncate text-sm text-muted">{lead.address}</p>
          )}
        </div>
      }
    >
      <section>
        <h3 className="font-semibold">Data source</h3>
        <div className="mt-2">
          <SourceChips sources={sourcesOf(lead)} />
        </div>
      </section>

      <Engagement lead={lead} />

      <section className="mt-6">
        <h3 className="font-semibold">Visit history</h3>

        {engagement.isPending && <p className="mt-2 text-sm text-muted">Loading…</p>}

        {engagement.data?.visits.length === 0 && (
          <p className="mt-2 text-sm text-muted">Nobody has visited this lead yet.</p>
        )}

        {engagement.data?.visits.map((visit) => (
          <div key={visit.id} className="mt-3 border-b border-border pb-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate font-semibold">
                {pairLabel({ pairId: visit.pair.id, pair: visit.pair })}
              </p>
              {visit.outcome && <OutcomeBadge outcome={visit.outcome} />}
            </div>

            {visit.notes ? (
              <p className="mt-2 text-sm">{visit.notes}</p>
            ) : (
              <p className="mt-2 text-sm text-muted">
                {visit.status === "PLANNED"
                  ? "Booked, not yet called on."
                  : "Nobody has written this visit up yet."}
              </p>
            )}

            <p className="mt-3 text-right text-sm text-muted">
              {visit.submittedAt
                ? day(visit.submittedAt)
                : visit.scheduledFor
                  ? bookedFor(visit.scheduledFor)
                  : ""}
            </p>
          </div>
        ))}
      </section>
    </Modal>
  );
}

function Engagement({ lead }: { lead: Lead }) {
  const engagement = useLeadEngagement(lead.id);
  const sync = useSyncChatwoot(lead.id);
  const url = engagement.data?.chatwootContactUrl;

  return (
    <section className="mt-6">
      <h3 className="font-semibold">Engagement</h3>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          View in Chatwoot
          <ExternalLink size={14} aria-hidden />
        </a>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            No Chatwoot contact yet. One is created automatically once this lead has a real
            conversation or engagement.
          </p>

          <Button
            variant="outline"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="mt-3 text-sm"
          >
            {sync.isPending ? "Linking…" : "Link now"}
          </Button>

          {sync.isError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {sync.error instanceof Error ? sync.error.message : "Could not link this lead"}
            </p>
          )}
        </>
      )}
    </section>
  );
}
