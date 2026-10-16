"use client";

import { useState } from "react";
import { RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useEnrichmentPreview, useEnrichmentStatus, useRunEnrichment } from "../hooks";
import type { EnrichmentStatus } from "../types";
import { EnrichmentComplete } from "./enrichment-complete";

type Ended = NonNullable<EnrichmentStatus["last"]>;

const since = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
};

export function EnrichmentControl() {
  const [confirming, setConfirming] = useState(false);
  const [watching, setWatching] = useState<{ runId: string; since: number } | null>(null);
  const [ended, setEnded] = useState<Ended | null>(null);
  const enrich = useRunEnrichment();
  const status = useEnrichmentStatus();

  const current = status.data?.current ?? null;

  if (current && current.runId !== watching?.runId) {
    setWatching({ runId: current.runId, since: status.dataUpdatedAt });
  } else if (!current && watching && status.dataUpdatedAt >= watching.since) {
    setWatching(null);
    const last = status.data?.last;
    if (last?.runId === watching.runId) setEnded(last);
  }

  async function start() {
    const since = Date.now();
    try {
      const run = await enrich.mutateAsync(undefined);
      setConfirming(false);
      setWatching({ runId: run.runId, since });
    } catch {
      // Left open, with the error shown, rather than closing on a failure.
    }
  }

  return (
    <>
      <Button
        variant="dark"
        onClick={() => {
          enrich.reset();
          setConfirming(true);
        }}
        disabled={enrich.isPending || Boolean(current)}
      >
        <RotateCw size={18} aria-hidden />
        {current ? "Enriching…" : "Run enrichment"}
      </Button>

      {current && (
        <p
          role="status"
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
        >
          <span className="font-medium">Enrichment is running</span>
          <span className="text-muted">
            {" "}
            — started {since(current.startedAt)}. About {current.processed} of {current.total}{" "}
            {current.total === 1 ? "lead" : "leads"} looked up so far.
          </span>
        </p>
      )}

      {ended?.error && (
        <p
          role="alert"
          className="flex w-full items-start justify-between gap-3 rounded-lg border border-danger px-4 py-3 text-sm text-danger"
        >
          <span>The enrichment run stopped before it finished: {ended.error}</span>
          <button
            type="button"
            onClick={() => setEnded(null)}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-0.5 hover:bg-sunken"
          >
            <X size={16} aria-hidden />
          </button>
        </p>
      )}

      {confirming && (
        <RunEnrichmentConfirm
          pending={enrich.isPending}
          error={enrich.error instanceof Error ? enrich.error.message : null}
          onConfirm={start}
          onClose={() => setConfirming(false)}
        />
      )}

      {ended?.summary && (
        <EnrichmentComplete summary={ended.summary} onClose={() => setEnded(null)} />
      )}
    </>
  );
}

function RunEnrichmentConfirm({
  pending,
  error,
  onConfirm,
  onClose,
}: {
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const preview = useEnrichmentPreview(true);
  const nothingToDo = preview.data?.candidates === 0;
  const unconfigured = preview.data?.configured === false;

  return (
    <ConfirmDialog
      title="Run enrichment?"
      confirmLabel="Run enrichment"
      pendingLabel="Starting…"
      onConfirm={onConfirm}
      onClose={onClose}
      pending={pending}
      disabled={preview.isPending || nothingToDo || unconfigured}
      error={error}
    >
      {preview.isPending && <p className="text-muted">Working out what this would cost…</p>}

      {preview.isError && (
        <p className="text-danger">
          Could not work out what this would look up. Run it only if you are sure.
        </p>
      )}

      {unconfigured && (
        <p className="text-danger">
          Apollo has no credentials configured, so a run would do nothing.
        </p>
      )}

      {preview.data && !unconfigured && (
        <>
          <p>
            {nothingToDo ? (
              "Nothing is waiting to be enriched. Every lead with a website has been looked up recently."
            ) : (
              <>
                This will look up{" "}
                <span className="font-medium">
                  {preview.data.candidates} {preview.data.candidates === 1 ? "lead" : "leads"}
                </span>{" "}
                on Apollo. Each lookup is billed, whether or not it finds anything.
              </>
            )}
          </p>

          {preview.data.cappedAt !== undefined && (
            <p className="mt-3 text-muted">
              That is the per-run cap — more are waiting behind it, and will need another run.
            </p>
          )}
        </>
      )}
    </ConfirmDialog>
  );
}
